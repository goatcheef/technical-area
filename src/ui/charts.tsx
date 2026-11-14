// Gráficos del centro de datos: SVG liviano, marcas finas, grilla discreta, tooltip al pasar el mouse
// y vista de tabla para cada uno (ningún dato depende solo del color o del tooltip).
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'

export const SERIES = { s1: 'var(--s1)', s2: 'var(--s2)', s3: 'var(--s3)', muted: 'var(--s-muted)' }
export interface Series { name: string; color: string; values: number[] }

function useWidth<T extends HTMLElement>(): [React.RefObject<T | null>, number] {
  const ref = useRef<T>(null)
  const [w, setW] = useState(600)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.clientWidth))
    ro.observe(el); setW(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}
/** Marcas redondas del eje: 0, 0.5, 1… o 0, 2, 4… */
function ticks(max: number, n = 4, int = false): number[] {
  if (max <= 0) return [0, 1]
  const raw = max / n, mag = 10 ** Math.floor(Math.log10(raw))
  let step = [1, 2, 2.5, 5, 10].map(k => k * mag).find(s => s >= raw)!
  if (int) step = Math.max(1, Math.ceil(step)) // conteos: escalones enteros
  const out: number[] = []
  for (let v = 0; v <= max + step * 0.001; v += step) out.push(+v.toFixed(6))
  if (out[out.length - 1] < max) out.push(+(out[out.length - 1] + step).toFixed(6))
  return out
}
const fmtN = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(v < 10 ? 2 : 1)).replace('.', ',')

/** Tarjeta de gráfico: título, leyenda (2 series o más), el gráfico y su tabla. */
export function ChartCard({ title, sub, legend, table, children, className = '' }: { title: string; sub?: string; legend?: { name: string; color: string; line?: boolean }[]; table: { head: string[]; rows: (string | number)[][] }; children: ReactNode; className?: string }) {
  const [tab, setTab] = useState(false)
  return (
    <div className={`card col chart-card ${className}`} style={{ gap: 8 }}>
      <div className="row between" style={{ alignItems: 'flex-start' }}>
        <div><h3>{title}</h3>{sub && <div className="dim sm" style={{ marginTop: 3 }}>{sub}</div>}</div>
        <button className="btn sm" aria-pressed={tab} onClick={() => setTab(!tab)}>{tab ? 'Ver gráfico' : 'Ver tabla'}</button>
      </div>
      {legend && legend.length > 1 && !tab && <div className="row wrap legend" style={{ gap: 14 }}>{legend.map(l => <span key={l.name} className="row sm" style={{ gap: 6 }}><i className={l.line ? 'lk-line' : 'lk-box'} style={{ background: l.color }} />{l.name}</span>)}</div>}
      {tab ? <div className="chart-table"><table><thead><tr>{table.head.map((h, i) => <th key={i} className={i ? 'r' : ''}>{h}</th>)}</tr></thead>
        <tbody>{table.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className={j ? 'r num' : ''}>{typeof c === 'number' ? fmtN(c) : c}</td>)}</tr>)}</tbody></table></div> : children}
    </div>
  )
}

function Tip({ x, y, w, children }: { x: number; y: number; w: number; children: ReactNode }) {
  const left = Math.min(Math.max(8, x + 14), w - 196)
  return <div className="chart-tip" style={{ left, top: Math.max(0, y - 10) }}>{children}</div>
}
const TipRow = ({ color, name, value, line }: { color: string; name: string; value: string; line?: boolean }) =>
  <div className="row" style={{ gap: 8 }}><i className={line ? 'lk-line' : 'lk-tick'} style={{ background: color }} /><b className="num">{value}</b><span className="dim">{name}</span></div>

const M = { l: 34, r: 12, t: 10, b: 26 }

/** Columnas agrupadas: una banda por categoría, una barra por serie (≤ 24 px, punta redondeada, base recta). */
export function Columns({ cats, series, height = 200, fmt = fmtN, tip, xLabel, int }: { cats: string[]; series: Series[]; height?: number; fmt?: (v: number) => string; tip?: (i: number) => ReactNode; xLabel?: (i: number) => ReactNode; int?: boolean }) {
  const [ref, W] = useWidth<HTMLDivElement>()
  const [hov, setHov] = useState<{ i: number; x: number; y: number } | null>(null)
  const max = Math.max(0.0001, ...series.flatMap(s => s.values))
  const tk = ticks(max, 4, int), top = tk[tk.length - 1]
  const iw = W - M.l - M.r, ih = height - M.t - M.b, band = iw / Math.max(1, cats.length)
  const bw = Math.max(3, Math.min(24, (band * 0.72 - 2 * (series.length - 1)) / series.length))
  const y = (v: number) => M.t + ih - (v / top) * ih
  const every = Math.ceil(cats.length / Math.max(1, Math.floor(iw / 38)))
  return (
    <div ref={ref} className="chart" style={{ height }} onPointerLeave={() => setHov(null)}>
      <svg width={W} height={height} role="img" aria-label={series.map(s => s.name).join(' y ')}>
        {tk.map(t => <g key={t}><line x1={M.l} x2={W - M.r} y1={y(t)} y2={y(t)} className={t ? 'gl' : 'ax'} /><text x={M.l - 6} y={y(t)} className="tk" textAnchor="end" dominantBaseline="middle">{fmt(t)}</text></g>)}
        {cats.map((c, i) => {
          const x0 = M.l + i * band + (band - (bw * series.length + 2 * (series.length - 1))) / 2
          return <g key={i} className={hov?.i === i ? 'hov' : ''}>
            {hov?.i === i && <rect x={M.l + i * band} y={M.t} width={band} height={ih} className="band" />}
            {series.map((s, k) => { const v = s.values[i] ?? 0, h = Math.max(0, y(0) - y(v)), x = x0 + k * (bw + 2), r = Math.min(4, h, bw / 2)
              return v > 0 ? <path key={k} d={`M${x},${y(0)} V${y(v) + r} Q${x},${y(v)} ${x + r},${y(v)} H${x + bw - r} Q${x + bw},${y(v)} ${x + bw},${y(v) + r} V${y(0)} Z`} fill={s.color} /> : null })}
            {i % every === 0 && <text x={M.l + i * band + band / 2} y={height - 8} className="tk" textAnchor="middle">{c}</text>}
            <rect x={M.l + i * band} y={0} width={band} height={height} fill="transparent" tabIndex={0} aria-label={`${c}: ${series.map(s => `${s.name} ${fmt(s.values[i] ?? 0)}`).join(', ')}`}
              onPointerMove={e => { const r = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect(); setHov({ i, x: e.clientX - r.left, y: e.clientY - r.top }) }}
              onFocus={() => setHov({ i, x: M.l + i * band + band / 2, y: M.t + 20 })} onBlur={() => setHov(null)} />
          </g>
        })}
      </svg>
      {hov && <Tip x={hov.x} y={hov.y} w={W}><div className="sm" style={{ marginBottom: 4 }}>{xLabel ? xLabel(hov.i) : cats[hov.i]}</div>{series.map(s => <TipRow key={s.name} color={s.color} name={s.name} value={fmt(s.values[hov.i] ?? 0)} />)}{tip?.(hov.i)}</Tip>}
    </div>
  )
}

/** Líneas con mira vertical: el tooltip muestra todas las series en esa posición. */
export function Lines({ cats, series, height = 200, fmt = fmtN, xLabel, int }: { cats: string[]; series: Series[]; height?: number; fmt?: (v: number) => string; xLabel?: (i: number) => ReactNode; int?: boolean }) {
  const [ref, W] = useWidth<HTMLDivElement>()
  const [hov, setHov] = useState<{ i: number; x: number; y: number } | null>(null)
  const n = Math.max(...series.map(s => s.values.length), 1)
  const max = Math.max(1, ...series.flatMap(s => s.values)), tk = ticks(max, 4, int), top = tk[tk.length - 1]
  const R = M.r + 64, iw = W - M.l - R, ih = height - M.t - M.b
  const x = (i: number) => M.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw), y = (v: number) => M.t + ih - (v / top) * ih
  const every = Math.ceil(n / Math.max(1, Math.floor(iw / 38)))
  return (
    <div ref={ref} className="chart" style={{ height }} onPointerLeave={() => setHov(null)}>
      <svg width={W} height={height} role="img" aria-label={series.map(s => s.name).join(' y ')}
        onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(), px = e.clientX - r.left; const i = Math.max(0, Math.min(n - 1, Math.round(((px - M.l) / Math.max(1, iw)) * (n - 1)))); setHov({ i, x: px, y: e.clientY - r.top }) }}>
        {tk.map(t => <g key={t}><line x1={M.l} x2={W - R} y1={y(t)} y2={y(t)} className={t ? 'gl' : 'ax'} /><text x={M.l - 6} y={y(t)} className="tk" textAnchor="end" dominantBaseline="middle">{fmt(t)}</text></g>)}
        {Array.from({ length: n }, (_, i) => i % every === 0 && <text key={i} x={x(i)} y={height - 8} className="tk" textAnchor="middle">{cats[i] ?? ''}</text>)}
        {hov && <line x1={x(hov.i)} x2={x(hov.i)} y1={M.t} y2={M.t + ih} className="cross" />}
        {series.map(s => s.values.length > 0 && <g key={s.name}>
          <polyline points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={x(s.values.length - 1)} cy={y(s.values[s.values.length - 1])} r={4} fill={s.color} className="ring" />
          {series.length <= 4 && <text x={x(s.values.length - 1) + 8} y={y(s.values[s.values.length - 1])} className="dl" dominantBaseline="middle">{fmt(s.values[s.values.length - 1])} {s.name.split(' ')[0]}</text>}
          {hov && s.values[hov.i] != null && <circle cx={x(hov.i)} cy={y(s.values[hov.i])} r={4} fill={s.color} className="ring" />}
        </g>)}
        <rect x={M.l} y={M.t} width={iw} height={ih} fill="transparent" tabIndex={0} aria-label="Recorrer con el teclado" onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const i = Math.max(0, Math.min(n - 1, (hov?.i ?? n - 1) + (e.key === 'ArrowRight' ? 1 : -1))); setHov({ i, x: x(i), y: M.t + 20 }) } }} onBlur={() => setHov(null)} />
      </svg>
      {hov && <Tip x={hov.x} y={hov.y} w={W}><div className="sm" style={{ marginBottom: 4 }}>{xLabel ? xLabel(hov.i) : cats[hov.i]}</div>{series.filter(s => s.values[hov.i] != null).map(s => <TipRow key={s.name} line color={s.color} name={s.name} value={fmt(s.values[hov.i])} />)}</Tip>}
    </div>
  )
}

/** Barras horizontales agrupadas, con el valor en la punta. */
export function HBars({ cats, series, fmt = fmtN, labelW = 100 }: { cats: string[]; series: Series[]; fmt?: (v: number) => string; labelW?: number }) {
  const [ref, W] = useWidth<HTMLDivElement>()
  const max = Math.max(0.0001, ...series.flatMap(s => s.values))
  const lab = labelW, val = 48, bh = 14, gap = 2, grp = series.length * bh + (series.length - 1) * gap, rowH = grp + 16
  const height = cats.length * rowH + 4, iw = Math.max(40, W - lab - val)
  return (
    <div ref={ref} className="chart" style={{ height }}>
      <svg width={W} height={height} role="img" aria-label={cats.join(', ')}>
        <line x1={lab} x2={lab} y1={0} y2={height} className="ax" />
        {cats.map((c, i) => <g key={c}>
          <text x={lab - 8} y={i * rowH + 8 + grp / 2} className="tk" textAnchor="end" dominantBaseline="middle" style={{ fontSize: 12 }}>{c}</text>
          {series.map((s, k) => { const v = s.values[i] ?? 0, w = (v / max) * iw, y0 = i * rowH + 8 + k * (bh + gap), r = Math.min(4, w)
            return <g key={k}><title>{`${c} · ${s.name}: ${fmt(v)}`}</title>
              {w > 0 && <path d={`M${lab},${y0} H${lab + w - r} Q${lab + w},${y0} ${lab + w},${y0 + r} V${y0 + bh - r} Q${lab + w},${y0 + bh} ${lab + w - r},${y0 + bh} H${lab} Z`} fill={s.color} />}
              <text x={lab + w + 6} y={y0 + bh / 2} className="dl" dominantBaseline="middle">{fmt(v)}</text></g> })}
        </g>)}
      </svg>
    </div>
  )
}

export interface Pt { id: number; x: number; y: number; label: string; hi?: boolean; tip?: ReactNode; icon?: ReactNode }
/** Dispersión: puntos grises y el propio resaltado; líneas de promedio como referencia. */
export function Scatter({ pts, xName, yName, invertY, height = 320, fmt = fmtN, onPick }: { pts: Pt[]; xName: string; yName: string; invertY?: boolean; height?: number; fmt?: (v: number) => string; onPick?: (id: number) => void }) {
  const [ref, W] = useWidth<HTMLDivElement>()
  const [hov, setHov] = useState<number | null>(null)
  if (!pts.length) return <div className="dim sm">Todavía no hay partidos jugados.</div>
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y)
  const pad = (a: number[]) => { const lo = Math.min(...a), hi = Math.max(...a), d = Math.max(0.1, hi - lo) * 0.12; return [Math.max(0, lo - d), hi + d] as const }
  const [x0, x1] = pad(xs), [y0, y1] = pad(ys), L = 44, B = 34
  const iw = W - L - 16, ih = height - 12 - B
  const X = (v: number) => L + ((v - x0) / (x1 - x0)) * iw
  const Y = (v: number) => (invertY ? 12 + ((v - y0) / (y1 - y0)) * ih : 12 + ih - ((v - y0) / (y1 - y0)) * ih)
  const ax = xs.reduce((s, v) => s + v, 0) / xs.length, ay = ys.reduce((s, v) => s + v, 0) / ys.length
  const tx = ticks(x1, 4).filter(t => t >= x0 && t <= x1), ty = ticks(y1, 4).filter(t => t >= y0 && t <= y1)
  // se rotulan el propio y los dos extremos (mejor y peor balance), no todos
  const score = (p: Pt) => (invertY ? p.x - p.y : p.x + p.y), ranked = [...pts].sort((a, b) => score(b) - score(a))
  const extremes = new Set([ranked[0].id, ranked[ranked.length - 1].id])
  const h = pts.find(p => p.id === hov)
  return (
    <div ref={ref} className="chart" style={{ height }} onPointerLeave={() => setHov(null)}>
      <svg width={W} height={height} role="img" aria-label={`${xName} contra ${yName}`}>
        {tx.map(t => <g key={`x${t}`}><line x1={X(t)} x2={X(t)} y1={12} y2={12 + ih} className="gl" /><text x={X(t)} y={height - B + 16} className="tk" textAnchor="middle">{fmt(t)}</text></g>)}
        {ty.map(t => <g key={`y${t}`}><line x1={L} x2={L + iw} y1={Y(t)} y2={Y(t)} className="gl" /><text x={L - 6} y={Y(t)} className="tk" textAnchor="end" dominantBaseline="middle">{fmt(t)}</text></g>)}
        <line x1={X(ax)} x2={X(ax)} y1={12} y2={12 + ih} className="avg" /><line x1={L} x2={L + iw} y1={Y(ay)} y2={Y(ay)} className="avg" />
        <text x={L + iw} y={height - 4} className="tk" textAnchor="end">{xName} →</text>
        <text x={L} y={8} className="tk">{yName}{invertY ? ' (mejor arriba)' : ''}</text>
        {[...pts].sort((a, b) => Number(!!a.hi) - Number(!!b.hi)).map(p => (
          <g key={p.id} onPointerEnter={() => setHov(p.id)} onFocus={() => setHov(p.id)} onBlur={() => setHov(null)} onClick={() => onPick?.(p.id)} tabIndex={0} style={{ cursor: onPick ? 'pointer' : undefined }} aria-label={`${p.label}: ${xName} ${fmt(p.x)}, ${yName} ${fmt(p.y)}`}>
            <circle cx={X(p.x)} cy={Y(p.y)} r={12} fill="transparent" />
            <circle cx={X(p.x)} cy={Y(p.y)} r={p.hi ? 6 : 4.5} fill={p.hi ? SERIES.s1 : SERIES.muted} className="ring" />
            {(p.hi || extremes.has(p.id) || hov === p.id) && <text x={X(p.x) + 9} y={Y(p.y)} className="dl" dominantBaseline="middle">{p.label}</text>}
          </g>))}
      </svg>
      {h && <Tip x={X(h.x)} y={Y(h.y)} w={W}><div className="row sm" style={{ gap: 6, marginBottom: 4 }}>{h.icon}{h.label}</div><TipRow color={h.hi ? SERIES.s1 : SERIES.muted} name={xName} value={fmt(h.x)} /><TipRow color={h.hi ? SERIES.s1 : SERIES.muted} name={yName} value={fmt(h.y)} />{h.tip}</Tip>}
    </div>
  )
}

/** Barra fina de proporción (minutos, uso) para celdas de tabla. */
export function Meter({ v, max, color = SERIES.s1, title }: { v: number; max: number; color?: string; title?: string }) {
  return <span className="meter" title={title}><i style={{ width: `${Math.min(100, (v / Math.max(1, max)) * 100)}%`, background: color }} /></span>
}
export { fmtN }
