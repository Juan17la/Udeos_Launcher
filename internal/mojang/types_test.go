package mojang

import (
	"encoding/json"
	"testing"
)

func TestMergeLoaderProfile(t *testing.T) {
	var parent, child Version
	must(t, json.Unmarshal([]byte(`{"id":"1.21.1","type":"release","mainClass":"net.minecraft.client.main.Main",
		"assetIndex":{"id":"17"},"downloads":{"client":{"url":"c"}},"javaVersion":{"component":"java-runtime-delta"},
		"arguments":{"game":["--username","${auth_player_name}"],"jvm":["-cp","${classpath}"]},
		"libraries":[{"name":"org.ow2.asm:asm:9.6","downloads":{"artifact":{"path":"p","url":"u"}}},{"name":"com.mojang:brigadier:1.2.9"}]}`), &parent))
	must(t, json.Unmarshal([]byte(`{"id":"fabric-loader-0.16.9-1.21.1","inheritsFrom":"1.21.1","mainClass":"net.fabricmc.loader.impl.launch.knot.KnotClient",
		"arguments":{"game":[],"jvm":["-DFabricMcEmu= net.minecraft.client.main.Main "]},
		"libraries":[{"name":"org.ow2.asm:asm:9.7.1","url":"https://maven.fabricmc.net/","sha1":"abc"},{"name":"net.fabricmc:fabric-loader:0.16.9","url":"https://maven.fabricmc.net/"}]}`), &child))

	v := Merge(&parent, &child)
	if v.ID != child.ID || v.BaseID() != "1.21.1" || v.InheritsFrom != "" {
		t.Errorf("ids: id=%s base=%s inherits=%q", v.ID, v.BaseID(), v.InheritsFrom)
	}
	if v.MainClass != child.MainClass || v.AssetIndex.ID != "17" || v.JavaVersion.Component != "java-runtime-delta" || v.Downloads["client"].URL != "c" {
		t.Errorf("wrong field sources: %+v", v)
	}
	if len(v.Arguments.JVM) != 3 || v.Arguments.JVM[2].Values[0] != "-DFabricMcEmu= net.minecraft.client.main.Main " {
		t.Errorf("jvm args: %+v", v.Arguments.JVM)
	}
	names := []string{}
	for _, l := range v.Libraries {
		names = append(names, l.Name)
	}
	want := []string{"org.ow2.asm:asm:9.7.1", "net.fabricmc:fabric-loader:0.16.9", "com.mojang:brigadier:1.2.9"}
	if len(names) != len(want) {
		t.Fatalf("libraries %v, want %v", names, want)
	}
	for i := range want {
		if names[i] != want[i] {
			t.Errorf("library %d = %s, want %s", i, names[i], want[i])
		}
	}
}

func TestMergeLegacyArguments(t *testing.T) {
	parent := &Version{ID: "1.7.10", MinecraftArguments: "--username ${auth_player_name}"}
	child := &Version{ID: "forge-1.7.10", InheritsFrom: "1.7.10", Jar: "1.7.10", MinecraftArguments: "--username ${auth_player_name} --tweakClass X"}
	v := Merge(parent, child)
	if v.MinecraftArguments != child.MinecraftArguments || v.Arguments != nil || v.Jar != "1.7.10" {
		t.Errorf("%+v", v)
	}
}

func TestLibraryKey(t *testing.T) {
	for name, want := range map[string]string{
		"org.ow2.asm:asm:9.6":                     "org.ow2.asm:asm",
		"org.lwjgl:lwjgl:3.3.3:natives-linux":     "org.lwjgl:lwjgl:natives-linux",
		"net.minecraftforge:forge:1.20.1-47.4.10": "net.minecraftforge:forge",
	} {
		if got := (Library{Name: name}).Key(); got != want {
			t.Errorf("Key(%s) = %s, want %s", name, got, want)
		}
	}
}

func must(t *testing.T, err error) {
	t.Helper()
	if err != nil {
		t.Fatal(err)
	}
}

func TestArgumentRoundTrip(t *testing.T) {
	in := `{"game":["--username",{"rules":[{"action":"allow","features":{"is_demo_user":true}}],"value":"--demo"},{"rules":[{"action":"allow","os":{"name":"osx"}}],"value":["-a","-b"]}],"jvm":["-DFabricMcEmu= net.minecraft.client.main.Main "]}`
	var a Arguments
	must(t, json.Unmarshal([]byte(in), &a))
	out, err := json.Marshal(a)
	must(t, err)
	var back Arguments
	must(t, json.Unmarshal(out, &back))
	if len(back.Game) != 3 || back.Game[1].Rules[0].Features["is_demo_user"] != true || back.Game[2].Values[1] != "-b" || back.JVM[0].Values[0] != "-DFabricMcEmu= net.minecraft.client.main.Main " {
		t.Errorf("round trip lost data: %s", out)
	}
}
