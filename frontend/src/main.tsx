import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@fontsource/jetbrains-mono/500.css'
import '@fontsource/jetbrains-mono/700.css'
import '@fontsource/jetbrains-mono/800.css'
import '@fontsource/pixelify-sans/400.css'
import '@fontsource/pixelify-sans/600.css'
import './theme/tokens.css'

// Dev only: ?shot keeps the window 'load' event pending for a moment so
// headless screenshots capture the page after fonts and data settle.
if (location.search.includes('shot')) { const img = new Image(); img.src = '/slow.png' }

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
