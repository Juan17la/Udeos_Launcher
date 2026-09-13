package content

import (
	"bufio"
	"compress/gzip"
	"encoding/binary"
	"errors"
	"fmt"
	"io"
	"math"
	"os"
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
