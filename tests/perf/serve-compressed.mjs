// Servidor estático de dist/ que sirve gzip o brotli (precomprimido en memoria), como lo haría un hosting real.
// `vite preview` NO comprime: para medir carga con red emulada hay que usar este.  Uso: node tests/perf/serve-compressed.mjs [dist] [puerto] [gzip|br|none]
import { createServer } from 'http'
import { readFileSync, existsSync, statSync } from 'fs'
import { gzipSync, brotliCompressSync, constants } from 'zlib'
import { join, extname, resolve } from 'path'
const dir = resolve(process.argv[2] || 'dist'), port = Number(process.argv[3] || 4320), mode = process.argv[4] || 'br'
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' }
const cache = new Map()
function enc(path, buf) {
  const k = path + mode
  if (!cache.has(k)) cache.set(k, mode === 'br' ? brotliCompressSync(buf, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: buf.length } }) : mode === 'gzip' ? gzipSync(buf, { level: 9 }) : buf)
  return cache.get(k)
}
createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname); if (p.endsWith('/')) p += 'index.html'
  const f = join(dir, p)
  if (!f.startsWith(dir) || !existsSync(f) || !statSync(f).isFile()) { res.writeHead(404); res.end('no'); return }
  const raw = readFileSync(f), ae = String(req.headers['accept-encoding'] || '')
  const use = mode === 'br' && ae.includes('br') ? 'br' : mode !== 'none' && ae.includes('gzip') && mode !== 'br' ? 'gzip' : mode === 'br' && ae.includes('gzip') ? 'gzip' : 'none'
  const h = { 'content-type': TYPES[extname(f)] || 'application/octet-stream', 'cache-control': 'no-cache' }
  let body = raw
  if (use !== 'none' && /\.(html|js|css|json)$/.test(f)) { body = use === 'br' ? enc(f, raw) : (cache.has(f + 'gz') ? cache.get(f + 'gz') : (cache.set(f + 'gz', gzipSync(raw, { level: 9 })), cache.get(f + 'gz'))); h['content-encoding'] = use }
  h['content-length'] = body.length
  res.writeHead(200, h); res.end(body)
}).listen(port, () => console.log(`sirviendo ${dir} en :${port} (${mode})`))
