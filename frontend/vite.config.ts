import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'

// The launcher version lives in wails.json; expose it to the UI at build time.
const wails = JSON.parse(readFileSync(new URL('../wails.json', import.meta.url), 'utf8'))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: { __APP_VERSION__: JSON.stringify(wails.info?.productVersion ?? '0.0.0') },
})
