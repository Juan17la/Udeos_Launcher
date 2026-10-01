package content

import (
	"bufio"
	"bytes"
	"compress/gzip"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"math"
	"os"
	"path/filepath"
)

// Minimal NBT reader — enough to read level.dat (LevelName, LastPlayed).
// NBT is a tree of typed, named tags; compounds nest until an End tag.

const (
	tagEnd byte = iota
	tagByte
	tagShort
	tagInt
	tagLong
	tagFloat
	tagDouble
	tagByteArray
	tagString
	tagList
	tagCompound
	tagIntArray
	tagLongArray
)

// readLevelDat decompresses level.dat and returns the root compound as a map.
func readLevelDat(path string) (map[string]any, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()
	gz, err := gzip.NewReader(f)
	if err != nil {
		return nil, err
	}
	defer gz.Close()
	r := bufio.NewReader(gz)
	typ, err := r.ReadByte()
	if err != nil {
		return nil, err
	}
	if typ != tagCompound {
		return nil, errors.New("level.dat root is not a compound")
	}
	if _, err := readString(r); err != nil { // root name (empty)
		return nil, err
	}
	v, err := readPayload(r, tagCompound)
	if err != nil {
		return nil, err
	}
	return v.(map[string]any), nil
}

func readString(r *bufio.Reader) (string, error) {
	var n uint16
	if err := binary.Read(r, binary.BigEndian, &n); err != nil {
		return "", err
	}
	buf := make([]byte, n)
	if _, err := io.ReadFull(r, buf); err != nil {
		return "", err
	}
	return string(buf), nil
}

func readPayload(r *bufio.Reader, typ byte) (any, error) {
	switch typ {
	case tagByte:
		b, err := r.ReadByte()
		return int8(b), err
	case tagShort:
		var v int16
		err := binary.Read(r, binary.BigEndian, &v)
		return v, err
	case tagInt:
		var v int32
		err := binary.Read(r, binary.BigEndian, &v)
		return v, err
	case tagLong:
		var v int64
		err := binary.Read(r, binary.BigEndian, &v)
		return v, err
	case tagFloat:
		var v uint32
		err := binary.Read(r, binary.BigEndian, &v)
		return math.Float32frombits(v), err
	case tagDouble:
		var v uint64
		err := binary.Read(r, binary.BigEndian, &v)
		return math.Float64frombits(v), err
	case tagByteArray, tagIntArray, tagLongArray:
		var n int32
		if err := binary.Read(r, binary.BigEndian, &n); err != nil {
			return nil, err
		}
		size := map[byte]int{tagByteArray: 1, tagIntArray: 4, tagLongArray: 8}[typ]
		if _, err := io.CopyN(io.Discard, r, int64(n)*int64(size)); err != nil {
			return nil, err
		}
		return nil, nil
	case tagString:
		return readString(r)
	case tagList:
		elem, err := r.ReadByte()
		if err != nil {
			return nil, err
		}
		var n int32
		if err := binary.Read(r, binary.BigEndian, &n); err != nil {
			return nil, err
		}
		list := make([]any, 0, n)
		for i := int32(0); i < n; i++ {
			v, err := readPayload(r, elem)
			if err != nil {
				return nil, err
			}
			list = append(list, v)
		}
		return list, nil
	case tagCompound:
		m := map[string]any{}
		for {
			t, err := r.ReadByte()
			if err != nil {
				return nil, err
			}
			if t == tagEnd {
				return m, nil
			}
			name, err := readString(r)
			if err != nil {
				return nil, err
			}
			v, err := readPayload(r, t)
			if err != nil {
				return nil, err
			}
			m[name] = v
		}
	default:
		return nil, fmt.Errorf("unknown nbt tag %d", typ)
	}
}

// WriteServersDat puts one server in the game's multiplayer list
// (<gameDir>/servers.dat: uncompressed NBT, a list named "servers" of
// {name, ip}). An existing list is left alone and reported as nil: the
// player's own servers come first.
func WriteServersDat(gameDir, name, ip string) error {
	path := filepath.Join(gameDir, "servers.dat")
	if _, err := os.Stat(path); err == nil {
		return nil
	}
	var b bytes.Buffer
	str := func(s string) {
		binary.Write(&b, binary.BigEndian, uint16(len(s)))
		b.WriteString(s)
	}
	b.WriteByte(tagCompound)
	str("") // root name
	b.WriteByte(tagList)
	str("servers")
	b.WriteByte(tagCompound)
	binary.Write(&b, binary.BigEndian, int32(1))
	b.WriteByte(tagString)
	str("ip")
	str(ip)
	b.WriteByte(tagString)
	str("name")
	str(name)
	b.WriteByte(tagEnd) // the server
	b.WriteByte(tagEnd) // the root
	if err := os.MkdirAll(gameDir, 0o755); err != nil {
		return err
	}
	return os.WriteFile(path, b.Bytes(), 0o644)
}
