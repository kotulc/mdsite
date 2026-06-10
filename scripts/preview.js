/**
 * Local preview server — serves dist/ with base_path prefix rewriting.
 * Strips the configured base_path from request URLs so assets resolve correctly
 * even when the production build has an assetPrefix baked in.
 */
const http = require('http')
const fs   = require('fs')
const path = require('path')

const cfg  = require('../site.config')
const BASE = (cfg.base_path || '').replace(/\/+$/, '')
const DIST = path.join(__dirname, '..', 'dist')
const PORT = process.env.PORT || 3000

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.json': 'application/json',
  '.svg':  'image/svg+xml',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt':  'text/plain',
  '.xml':  'application/xml',
}

http.createServer((req, res) => {
  let url = req.url.split('?')[0]

  if (BASE && url.startsWith(BASE)) url = url.slice(BASE.length) || '/'
  if (!url.startsWith('/')) url = '/' + url

  let file = path.join(DIST, url)
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
    file = path.join(file, 'index.html')
  }

  if (!fs.existsSync(file)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' })
    res.end('Not found: ' + url)
    return
  }

  const mime = MIME[path.extname(file)] || 'application/octet-stream'
  res.writeHead(200, { 'Content-Type': mime })
  fs.createReadStream(file).pipe(res)
}).listen(PORT, () => {
  console.log(`\nPreview: http://localhost:${PORT}${BASE}/\n`)
})
