import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource-variable/outfit'
import App from './App.jsx'
import './index.css'

/*
  The home page arrives pre-rendered (see scripts/prerender.mjs), so React
  only attaches to the HTML that is already on screen ("hydrates") instead of
  building it from nothing. Every other address — /admin, /about, /search —
  is served the plain shell and starts from an empty page.
*/
const container = document.getElementById('root')
const app = (
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
const isHome = window.location.pathname.replace(/\/+$/, '') === '' && !/^#(admin|about)$/i.test(window.location.hash)

if (isHome && container.hasChildNodes()) {
  ReactDOM.hydrateRoot(container, app)
} else {
  // If a server sent the pre-rendered home page for another address, drop it.
  container.textContent = ''
  ReactDOM.createRoot(container).render(app)
}
