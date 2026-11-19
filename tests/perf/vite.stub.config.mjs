// Build de producción con el motor reducido: STUB=crests,db OUT=/tmp/x npx vite build --config tests/perf/vite.stub.config.mjs  (mide cuánto pesa cada dato dentro del bundle; no usar para publicar).
// Config de medición (fuera del repo): arma el bundle con crests.json y/o db.json reemplazados por stubs.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
const stub = (process.env.STUB || '').split(',').filter(Boolean)
export default defineConfig({
  root: process.cwd(), base: './', plugins: [react(), {
    name: 'stub', enforce: 'pre',
    load(id) {
      if (stub.includes('crests') && id.endsWith('src/data/crests.json')) return { code: 'export default {}', moduleType: 'js' }
      if (stub.includes('db') && id.endsWith('src/data/db.json')) return { code: 'export default {start:"2026-01-01",dbVersion:"x",clubs:[],players:[]}', moduleType: 'js' }
    }
  }],
  build: { outDir: process.env.OUT, emptyOutDir: true, reportCompressedSize: false },
})
