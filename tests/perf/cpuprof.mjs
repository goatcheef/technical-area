// Resumen de un .cpuprofile de Node: tiempo propio por función y tiempo inclusivo de src/. Uso: node --cpu-prof --cpu-prof-dir=/tmp/prof --import tsx tests/perf/engine-bench.ts 1 ; node tests/perf/cpuprof.mjs /tmp/prof/*.cpuprofile [filas] [filas-inclusivo]
import { readFileSync } from 'fs'
const p = JSON.parse(readFileSync(process.argv[2]))
const byId = new Map(p.nodes.map(n => [n.id, n]))
const self = new Map(); const dt = p.timeDeltas
for (let i = 0; i < p.samples.length; i++) self.set(p.samples[i], (self.get(p.samples[i]) || 0) + dt[i])
// self time por función (nombre+archivo:línea)
const agg = new Map(); let total = 0
for (const [id, t] of self) { const n = byId.get(id), c = n.callFrame; const k = `${c.functionName || '(anon)'} ${c.url.replace(/^.*technical-area\//, '')}:${c.lineNumber + 1}`; agg.set(k, (agg.get(k) || 0) + t); total += t }
const rows = [...agg].sort((a, b) => b[1] - a[1]).slice(0, Number(process.argv[3] || 25))
console.log('total ms', (total / 1000).toFixed(0))
for (const [k, t] of rows) console.log(String((t / 1000).toFixed(0)).padStart(7), 'ms', ((t / total) * 100).toFixed(1).padStart(5) + '%', k)
// inclusive por función del repo
const parent = new Map(); for (const n of p.nodes) for (const c of n.children || []) parent.set(c, n.id)
const incl = new Map()
for (const [id, t] of self) { const seen = new Set(); let cur = id; while (cur) { const c = byId.get(cur).callFrame; const k = `${c.functionName || '(anon)'} ${c.url.replace(/^.*technical-area\//, '')}:${c.lineNumber + 1}`; if (c.url.includes('src/') && !seen.has(k)) { seen.add(k); incl.set(k, (incl.get(k) || 0) + t) } cur = parent.get(cur) } }
console.log('\n--- inclusivo (src/) ---')
for (const [k, t] of [...incl].sort((a, b) => b[1] - a[1]).slice(0, Number(process.argv[4] || 30))) console.log(String((t / 1000).toFixed(0)).padStart(7), 'ms', ((t / total) * 100).toFixed(1).padStart(5) + '%', k)
