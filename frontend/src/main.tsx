import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import '@fontsource/pt-mono/400.css' // the design system's one typeface (single weight; bold is synthesised)
import './theme/tokens.css'

// Dev only: ?shot keeps the window 'load' event pending for a moment so
// headless screenshots capture the page after fonts and data settle.
if (location.search.includes('shot')) { const img = new Image(); img.src = '/slow.png' }

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
