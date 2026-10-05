/*
  Post-build step (runs after `vite build` and the SSR build — see "build" in
  package.json):

  1. Saves the plain app shell as dist/app.html, for every address other than
     the home page (/admin, /about, /search…).
  2. Renders the public home page to HTML and puts it inside #root, so it
     paints before any JavaScript has downloaded.
  3. Preloads the font and inlines only the CSS the first screen needs
     (Beasties); the full stylesheet still loads, without blocking paint.
  4. Pre-compresses every text file to .br and .gz, so the server can send the
     smallest version without compressing on each request.
*/
import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { fileURLToPath, pathToFileURL } from 'url'
import Beasties from 'beasties'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const ssrDir = path.join(root, 'dist-ssr')
const kb = (n) => `${(n / 1024).toFixed(1)} KB`

// 1. Shell for every other route.
const shell = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
if (!shell.includes('<div id="root"></div>')) throw new Error('dist/index.html has no empty #root to fill')
fs.writeFileSync(path.join(dist, 'app.html'), shell)

// 2. Pre-render the home page.
const entry = fs.readdirSync(ssrDir).find((f) => /^entry-server\.(m?js)$/.test(f))
const { render } = await import(pathToFileURL(path.join(ssrDir, entry)).href)
const appHtml = render()
let html = shell.replace('<div id="root"></div>', `<div id="root">${appHtml}</div>`)

// 3a. Preload the Latin font file, so text paints in the right font first time.
const font = fs.readdirSync(path.join(dist, 'assets')).find((f) => /^outfit-latin-wght-normal-.*\.woff2$/.test(f))
if (font) {
  html = html.replace('</title>', `</title>\n    <link rel="preload" href="/assets/${font}" as="font" type="font/woff2" crossorigin />`)
}

// Stock photos for vehicles without their own picture come from Unsplash.
html = html.replace('</title>', '</title>\n    <link rel="preconnect" href="https://images.unsplash.com" />')

// 3b. Critical CSS inline; the full stylesheet moves to the end of <body>
// (no inline script or onload handler, so it works under a strict CSP).
const beasties = new Beasties({
  path: dist,
  publicPath: '/',
  preload: 'body',
  pruneSource: false,
  reduceInlineStyles: false,
  inlineFonts: false,
  logLevel: 'warn',
})
if (process.env.CRITICAL_CSS !== '0') html = await beasties.process(html)
fs.writeFileSync(path.join(dist, 'index.html'), html)
fs.rmSync(ssrDir, { recursive: true, force: true })

// 4. Pre-compress.
let raw = 0, br = 0
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
  d.isDirectory() ? walk(path.join(dir, d.name)) : [path.join(dir, d.name)])
for (const file of walk(dist)) {
  if (!/\.(js|css|html|svg|json|txt|xml|webmanifest)$/.test(file)) continue
  const data = fs.readFileSync(file)
  if (data.length < 1024) continue
  const b = zlib.brotliCompressSync(data, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11, [zlib.constants.BROTLI_PARAM_SIZE_HINT]: data.length } })
  const g = zlib.gzipSync(data, { level: 9 })
  fs.writeFileSync(file + '.br', b)
  fs.writeFileSync(file + '.gz', g)
  raw += data.length; br += b.length
}
console.log(`prerender: home page ${kb(appHtml.length)} of HTML; text assets ${kb(raw)} -> ${kb(br)} with Brotli`)
