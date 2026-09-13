// Package mojang models the public, unauthenticated metadata Mojang publishes
// on piston-meta.mojang.com: the version manifest, per-version JSON files and
// asset indexes. No account is involved at any point.
package mojang

import (
	"encoding/json"
	"strings"
)

// ManifestURL lists every Minecraft version ever released.
const ManifestURL = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json"

// ResourcesURL is the CDN that serves asset objects addressed by their SHA-1.
const ResourcesURL = "https://resources.download.minecraft.net/"

// LibrariesURL is the maven repository used when a library has no explicit download URL.
const LibrariesURL = "https://libraries.minecraft.net/"

// Manifest is version_manifest_v2.json.
type Manifest struct {
	Latest struct {
		Release  string `json:"release"`
		Snapshot string `json:"snapshot"`
	} `json:"latest"`
	Versions []ManifestVersion `json:"versions"`
}

// ManifestVersion is one entry of the manifest: where to fetch the version JSON.
type ManifestVersion struct {
	ID          string `json:"id"`
	Type        string `json:"type"` // release | snapshot | old_beta | old_alpha
	URL         string `json:"url"`
	Time        string `json:"time"`
	ReleaseTime string `json:"releaseTime"`
	SHA1        string `json:"sha1"`
}

// Version is <id>.json: everything needed to download and start one version.
// Mod loader profiles (Fabric, Forge) use the same shape but only carry what
// they add on top of a vanilla version, named in InheritsFrom.
type Version struct {
	ID                 string              `json:"id"`
	InheritsFrom       string              `json:"inheritsFrom,omitempty"` // parent vanilla version (mod loaders)
	Jar                string              `json:"jar,omitempty"`          // version whose client jar to use; defaults to ID
	Type               string              `json:"type"`
	ReleaseTime        string              `json:"releaseTime"`
	MainClass          string              `json:"mainClass"`
	MinecraftArguments string              `json:"minecraftArguments,omitempty"` // versions <= 1.12
	Arguments          *Arguments          `json:"arguments,omitempty"`          // versions >= 1.13
	AssetIndex         AssetIndexRef       `json:"assetIndex"`
	Assets             string              `json:"assets"`
	Downloads          map[string]Artifact `json:"downloads"` // "client", "server", ...
	Libraries          []Library           `json:"libraries"`
	JavaVersion        *JavaVersion        `json:"javaVersion,omitempty"`
	Logging            *Logging            `json:"logging,omitempty"`
}

// Arguments holds the modern argument lists. Entries are plain strings or
// conditional groups guarded by rules.
type Arguments struct {
	Game []Argument `json:"game"`
	JVM  []Argument `json:"jvm"`
}

// Argument is either "string" or {"rules": [...], "value": "string" | ["a", "b"]}.
type Argument struct {
	Rules  []Rule
	Values []string
}

// UnmarshalJSON accepts both shapes of an argument entry.
func (a *Argument) UnmarshalJSON(data []byte) error {
	var s string
	if err := json.Unmarshal(data, &s); err == nil {
		a.Values = []string{s}
		return nil
	}
	var obj struct {
		Rules []Rule          `json:"rules"`
		Value json.RawMessage `json:"value"`
	}
	if err := json.Unmarshal(data, &obj); err != nil {
		return err
	}
	a.Rules = obj.Rules
	var one string
	if err := json.Unmarshal(obj.Value, &one); err == nil {
		a.Values = []string{one}
		return nil
	}
	return json.Unmarshal(obj.Value, &a.Values)
}

// MarshalJSON writes the argument back in the shape it was read from, so a
// version json can be saved and read again (loader profiles are).
func (a Argument) MarshalJSON() ([]byte, error) {
	if len(a.Rules) == 0 && len(a.Values) == 1 {
		return json.Marshal(a.Values[0])
	}
	return json.Marshal(struct {
		Rules []Rule   `json:"rules,omitempty"`
		Value []string `json:"value"`
	}{a.Rules, a.Values})
}

// Rule allows or disallows something depending on OS and launcher features.
type Rule struct {
	Action   string          `json:"action"` // allow | disallow
	OS       *OSRule         `json:"os,omitempty"`
	Features map[string]bool `json:"features,omitempty"`
}

// OSRule matches the operating system.
type OSRule struct {
	Name    string `json:"name,omitempty"`    // windows | linux | osx
	Version string `json:"version,omitempty"` // regex on the OS version
	Arch    string `json:"arch,omitempty"`    // x86 | x86_64 | arm64
}

// AssetIndexRef points at the asset index file for the version.
type AssetIndexRef struct {
	ID        string `json:"id"`
	SHA1      string `json:"sha1"`
	Size      int64  `json:"size"`
	TotalSize int64  `json:"totalSize"`
	URL       string `json:"url"`
}

// Artifact is a downloadable file with its integrity hash.
type Artifact struct {
	ID   string `json:"id,omitempty"`   // only for logging configs
	Path string `json:"path,omitempty"` // relative maven path, only for libraries
	SHA1 string `json:"sha1"`
	Size int64  `json:"size"`
	URL  string `json:"url"`
}

// Library is one jar on the classpath, possibly with platform natives.
type Library struct {
	Name      string            `json:"name"` // group:artifact:version[:classifier]
	Downloads *LibraryDownloads `json:"downloads,omitempty"`
	Natives   map[string]string `json:"natives,omitempty"` // os -> classifier (old style, <= 1.18)
	Rules     []Rule            `json:"rules,omitempty"`
	Extract   *Extract          `json:"extract,omitempty"`
	URL       string            `json:"url,omitempty"`  // maven base URL (mod loaders)
	SHA1      string            `json:"sha1,omitempty"` // Fabric meta lists the hash next to the maven URL
	Size      int64             `json:"size,omitempty"`
}

// LibraryDownloads has the main artifact and, for old versions, native classifiers.
type LibraryDownloads struct {
	Artifact    *Artifact           `json:"artifact,omitempty"`
	Classifiers map[string]Artifact `json:"classifiers,omitempty"`
}

// Extract tells which entries to skip when unpacking a natives jar.
type Extract struct {
	Exclude []string `json:"exclude"`
}

// JavaVersion names the Mojang-provided runtime the version expects.
type JavaVersion struct {
	Component    string `json:"component"` // jre-legacy | java-runtime-alpha/beta/gamma/delta
	MajorVersion int    `json:"majorVersion"`
}

// Logging carries the log4j configuration the client should use.
type Logging struct {
	Client *struct {
		Argument string   `json:"argument"` // "-Dlog4j.configurationFile=${path}"
		File     Artifact `json:"file"`
		Type     string   `json:"type"`
	} `json:"client,omitempty"`
}

// AssetIndex is assets/indexes/<id>.json: every asset object by its virtual path.
type AssetIndex struct {
	Objects        map[string]AssetObject `json:"objects"`
	Virtual        bool                   `json:"virtual,omitempty"`          // <= 1.7.2: game reads files by name
	MapToResources bool                   `json:"map_to_resources,omitempty"` // <= 1.5: files go into <gameDir>/resources
}

// AssetObject is one asset on the CDN, addressed by hash.
type AssetObject struct {
	Hash string `json:"hash"`
	Size int64  `json:"size"`
}

// URL is where the object is served from.
func (o AssetObject) URL() string { return ResourcesURL + o.Hash[:2] + "/" + o.Hash }

// IsNativeOnly reports whether the library is a modern (1.19+) natives jar,
// e.g. org.lwjgl:lwjgl:3.3.1:natives-linux. Those are also extracted.
func (l Library) IsNativeOnly() bool {
	parts := strings.Split(l.Name, ":")
	return len(parts) == 4 && strings.HasPrefix(parts[3], "natives-")
}

// BaseID is the vanilla version that owns the client jar and natives: the
// version itself, or the one a loader profile inherits from.
func (v *Version) BaseID() string {
	if v.Jar != "" {
		return v.Jar
	}
	return v.ID
}

// Merge layers a loader profile (child) over the vanilla version it inherits
// from, the way the official launcher does: the child's main class and
// arguments win, its libraries go first on the classpath and replace parent
// libraries with the same name, and everything about assets, downloads, Java
// and logging comes from the parent.
func Merge(parent, child *Version) *Version {
	out := *parent
	out.ID = child.ID
	out.InheritsFrom = ""
	out.Jar = parent.BaseID()
	if child.Jar != "" {
		out.Jar = child.Jar
	}
	if child.Type != "" {
		out.Type = child.Type
	}
	if child.ReleaseTime != "" {
		out.ReleaseTime = child.ReleaseTime
	}
	if child.MainClass != "" {
		out.MainClass = child.MainClass
	}
	if child.MinecraftArguments != "" {
		out.MinecraftArguments = child.MinecraftArguments
	}
	if child.Arguments != nil {
		merged := Arguments{}
		if parent.Arguments != nil {
			merged.Game = append(merged.Game, parent.Arguments.Game...)
			merged.JVM = append(merged.JVM, parent.Arguments.JVM...)
		}
		merged.Game = append(merged.Game, child.Arguments.Game...)
		merged.JVM = append(merged.JVM, child.Arguments.JVM...)
		out.Arguments = &merged
	}
	seen := map[string]bool{}
	libs := make([]Library, 0, len(child.Libraries)+len(parent.Libraries))
	for _, l := range child.Libraries {
		seen[l.Key()] = true
		libs = append(libs, l)
	}
	for _, l := range parent.Libraries {
		if !seen[l.Key()] {
			libs = append(libs, l)
		}
	}
	out.Libraries = libs
	return &out
}

// Key identifies a library regardless of its version: group:artifact[:classifier].
func (l Library) Key() string {
	parts := strings.Split(l.Name, ":")
	if len(parts) < 3 {
		return l.Name
	}
	key := parts[0] + ":" + parts[1]
	if len(parts) > 3 {
		key += ":" + parts[3]
	}
	return key
}

// MavenPath converts "group:artifact:version[:classifier]" into the relative
// repository path used when a library lacks an explicit download entry.
func MavenPath(name string) string {
	parts := strings.Split(name, ":")
	if len(parts) < 3 {
		return name
	}
	group := strings.ReplaceAll(parts[0], ".", "/")
	file := parts[1] + "-" + parts[2]
	if len(parts) > 3 {
		file += "-" + parts[3]
	}
	return group + "/" + parts[1] + "/" + parts[2] + "/" + file + ".jar"
}
