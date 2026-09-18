package launch

import (
	"encoding/json"
	"strings"
	"testing"

	"udeos/launcher/internal/mojang"
	"udeos/launcher/internal/paths"
	"udeos/launcher/internal/rules"
)

const modern = `{
 "id":"1.21.1","type":"release","mainClass":"net.minecraft.client.main.Main",
 "assetIndex":{"id":"17","url":"u"},
 "arguments":{
  "game":["--username","${auth_player_name}","--version","${version_name}","--gameDir","${game_directory}",
          {"rules":[{"action":"allow","features":{"is_demo_user":true}}],"value":"--demo"},
          {"rules":[{"action":"allow","features":{"has_custom_resolution":true}}],"value":["--width","${resolution_width}"]}],
  "jvm":[{"rules":[{"action":"allow","os":{"name":"osx"}}],"value":["-XstartOnFirstThread"]},
         "-Djava.library.path=${natives_directory}/java","-cp","${classpath}"]},
 "libraries":[
  {"name":"com.mojang:brigadier:1.2.9","downloads":{"artifact":{"path":"com/mojang/brigadier/1.2.9/brigadier-1.2.9.jar","url":"u"}}},
  {"name":"org.lwjgl:lwjgl:3.3.3:natives-linux","downloads":{"artifact":{"path":"org/lwjgl/lwjgl/3.3.3/lwjgl-3.3.3-natives-linux.jar","url":"u"}},"rules":[{"action":"allow","os":{"name":"linux"}}]},
  {"name":"ca.weblite:java-objc-bridge:1.1","downloads":{"artifact":{"path":"ca/weblite/java-objc-bridge/1.1/java-objc-bridge-1.1.jar","url":"u"}},"rules":[{"action":"allow","os":{"name":"osx"}}]}
 ]}`

const legacy = `{
 "id":"1.12.2","type":"release","mainClass":"net.minecraft.client.main.Main",
 "assetIndex":{"id":"1.12","url":"u"},
 "minecraftArguments":"--username ${auth_player_name} --uuid ${auth_uuid} --accessToken ${auth_access_token} --userType ${user_type}",
 "libraries":[{"name":"net.java.jinput:jinput:2.0.5","downloads":{"artifact":{"path":"net/java/jinput/jinput/2.0.5/jinput-2.0.5.jar","url":"u"}}}]}`

func params(t *testing.T, raw string) Params {
	var v mojang.Version
	if err := json.Unmarshal([]byte(raw), &v); err != nil {
		t.Fatal(err)
	}
	return Params{
		Version: &v, Dirs: paths.FromRoot("/data"), GameDir: "/data/instances/x/.minecraft",
		Nickname: "Steve", UUID: "uuid-1", JavaPath: "java", MaxMemoryMB: 1024,
		Env: rules.Env{OS: "linux", Arch: "x86_64"}, LauncherVersion: "test",
	}
}

func TestModernArguments(t *testing.T) {
	args := strings.Join(Arguments(params(t, modern)), " ")
	for _, want := range []string{"-Xmx1024M", "--username Steve", "--version 1.21.1", "net.minecraft.client.main.Main", "brigadier-1.2.9.jar", "1.21.1.jar",
		"lwjgl-3.3.3-natives-linux.jar:", "-Djava.library.path=/data/versions/1.21.1/natives/java"} {
		if !strings.Contains(args, want) {
			t.Errorf("missing %q in %s", want, args)
		}
	}
	for _, no := range []string{"--demo", "--width", "-XstartOnFirstThread", "java-objc-bridge"} {
		if strings.Contains(args, no) {
			t.Errorf("unexpected %q in %s", no, args)
		}
	}
}

func TestLegacyArguments(t *testing.T) {
	args := strings.Join(Arguments(params(t, legacy)), " ")
	for _, want := range []string{"-Djava.library.path=/data/versions/1.12.2/natives", "-cp ", "--uuid uuid-1", "--accessToken 0", "--userType legacy"} {
		if !strings.Contains(args, want) {
			t.Errorf("missing %q in %s", want, args)
		}
	}
}
