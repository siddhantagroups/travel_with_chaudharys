import React from 'react'
import { renderToString } from 'react-dom/server'
import App from './App.jsx'

// Build-time only: renders the public home page to HTML for scripts/prerender.mjs.
// Must render exactly what main.jsx hydrates (same tree, same StrictMode).
export const render = () =>
  renderToString(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
