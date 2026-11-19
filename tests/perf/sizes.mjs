// Tamaño de cada archivo emitido (crudo, gzip, brotli). Uso: node tests/perf/sizes.mjs dist [otro-dist...]  (desde la raíz del repo)
import { readFileSync, readdirSync } from 'fs'
import { gzipSync, brotliCompressSync, constants } from 'zlib'
for (const d of process.argv.slice(2)) for (const f of readdirSync(d + '/assets')) {
  const b = readFileSync(`${d}/assets/${f}`)
  const gz = gzipSync(b, { level: 9 }).length, br = brotliCompressSync(b, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: b.length } }).length
  console.log(`${d.split('/').pop().padEnd(14)} ${f.padEnd(26)} raw ${b.length}  gzip ${gz}  br ${br}`)
}
// individual raw sources
for (const f of ['src/data/crests.json', 'src/data/db.json']) {
  const b = readFileSync(f)
  console.log(f, 'raw', b.length, 'gzip', gzipSync(b, { level: 9 }).length, 'br', brotliCompressSync(b).length)
}
