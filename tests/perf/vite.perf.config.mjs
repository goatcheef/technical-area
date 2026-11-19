// Build de producción idéntico al real más window.__eng (el motor) para las pruebas de rendimiento: OUT=/tmp/dist-perf npx vite build --config tests/perf/vite.perf.config.mjs
// Build de producción idéntico al real, más window.__eng (el motor) para poder avanzar temporadas dentro de la página. Fuera del repo.
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  root: process.cwd(), base: './', plugins: [react(), {
    name: 'expose-engine', enforce: 'post',
    transform(code, id) { if (id.endsWith('src/main.tsx')) return { code: code + "\nimport * as __g from './engine/game'; import * as __c from './engine/career'; import * as __a from './engine/analytics'; window.__eng = { ...__g, ...__c, ...__a };\n", map: null } }
  }],
  build: { outDir: process.env.OUT, emptyOutDir: true, reportCompressedSize: false },
})
