package main

import (
	"embed"
	"net/http"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
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
	})
	if err != nil {
		println("Error:", err.Error())
	}
}
