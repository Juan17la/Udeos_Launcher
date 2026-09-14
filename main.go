package main

import (
	"embed"
	"net/http"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/linux"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	app := NewApp()

	err := wails.Run(&options.App{
		Title:     "Udeos Launcher",
		Width:     1180,
		Height:    760,
		MinWidth:  960,
		MinHeight: 640,
		AssetServer: &assetserver.Options{
			Assets:  assets,
			Handler: http.HandlerFunc(app.mediaHandler), // anything not in the embedded frontend
		},
		OnStartup: app.startup,
		Bind: []interface{}{
			app,
		},
		DragAndDrop: &options.DragAndDrop{
			EnableFileDrop: true,
		},
		// With options.Linux left nil, Wails forces WebviewGpuPolicyNever and
		// WebKitGTK rasterizes every frame on the CPU. OnDemand lets it
		// composite on the GPU when content asks for it (transforms, scroll).
		// Switch to WebviewGpuPolicyNever if a driver shows artefacts.
		Linux: &linux.Options{
			WebviewGpuPolicy: linux.WebviewGpuPolicyOnDemand,
		},
	})
	if err != nil {
		println("Error:", err.Error())
	}
}
