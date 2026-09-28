// Command seal prints $GROQ_API_KEY scrambled for the launcher's built-in
// key, to stamp in at build time:
//
//	wails build -ldflags "-X udeos/launcher/internal/ai.sealed=$(go run ./internal/ai/seal)"
//
// It prints nothing when the variable is empty (the build then has no
// built-in key and AI search asks for the player's own).
package main

import (
	"fmt"
	"os"
	"strings"

	"udeos/launcher/internal/ai"
)

func main() {
	if key := strings.TrimSpace(os.Getenv("GROQ_API_KEY")); key != "" {
		fmt.Print(ai.Seal(key))
	}
}
