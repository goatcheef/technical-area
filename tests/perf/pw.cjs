// Ayudas de las pruebas de rendimiento con Playwright (Chromium): contexto con red / CPU emulados, métricas de CDP, estadística.
const { chromium } = require('../ui/helpers.cjs')
const sleep = ms => new Promise(r => setTimeout(r, ms))
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN }
const med = a => q(a, .5), p95 = a => q(a, .95)
const fx = (v, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : 'n/d')
/** Perfiles: la red "4G" es 9 Mbps de bajada, 1,5 Mbps de subida y 70 ms de latencia (el perfil "Fast 4G" de las DevTools, 60-70 ms); la CPU 4x más lenta es un Android de gama media. */
const PROFILES = {
  desktop: { cpu: 1, net: null },
  mobile4g: { cpu: 4, net: { offline: false, latency: 70, downloadThroughput: (9 * 1e6) / 8, uploadThroughput: (1.5 * 1e6) / 8 } },
  cpu4: { cpu: 4, net: null },
}
async function throttle(page, prof) {
  const c = await page.context().newCDPSession(page)
  await c.send('Emulation.setCPUThrottlingRate', { rate: prof.cpu })
  if (prof.net) await c.send('Network.emulateNetworkConditions', prof.net)
  return c
}
/** Fuentes de Google: el sandbox no tiene salida a esa red; se aborta para no medir un tiempo de espera ajeno (queda anotado en el informe). */
async function blockFonts(ctx) { await ctx.route(/fonts\.(googleapis|gstatic)\.com/, r => r.abort()) }
const launch = () => chromium.launch({ args: ['--enable-precise-memory-info', '--js-flags=--expose-gc', '--disable-dev-shm-usage'] })
const stats = (a, d = 0) => `mediana ${fx(med(a), d)} · p95 ${fx(p95(a), d)} · mín ${fx(Math.min(...a), d)} · máx ${fx(Math.max(...a), d)} (n=${a.length})`
/** window.__ctx(): el valor de GameCtx leído de las fibras de React (misma idea que tests/ui/helpers.cjs). */
const installCtx = page => page.evaluate(() => { window.__ctx = () => { const root = document.getElementById('root'), ck = Object.keys(root).find(k => k.startsWith('__reactContainer')); const st = [root[ck].stateNode.current]; for (let n = 0; st.length && n < 8000; n++) { const f = st.pop(), v = f.memoizedProps?.value; if (v && v.g && v.nav && v.refresh) return v; if (f.sibling) st.push(f.sibling); if (f.child) st.push(f.child) } return null } })
module.exports = { installCtx, chromium, launch, sleep, q, med, p95, fx, stats, PROFILES, throttle, blockFonts }
