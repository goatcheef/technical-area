// Centro de datos: rendimiento del equipo, uso del plantel, análisis de rivales y de la liga.
import { useState, type ReactNode } from 'react'
import { compOf, goalsByBin, leagueBins, leagueRows, matchRows, playerUse, pointsRace, sectors, summary, type LeagueRow, type MatchRow } from '../engine/analytics'
import { clubsIn, fmtDate, leagueFx, nextUserFixture, squadOf, tableOf } from '../engine/game'
import { POS_LABEL } from '../engine/positions'
import type { Game } from '../engine/types'
import { useGame, useSticky } from '../store'
import { Badge, Cond, Face, PosPill, Spark, avgRat, ratClass } from './common'
import { ChartCard, Columns, HBars, Lines, Meter, SERIES, Scatter, fmtN } from './charts'

const BINS = ["1'-15'", "16'-30'", "31'-45'", "46'-60'", "61'-75'", "76'-90'"]
const TABS: [string, string][] = [['equipo', 'Mi equipo'], ['jugadores', 'Jugadores'], ['rivales', 'Rivales'], ['liga', 'Liga']]
const f2 = (v: number) => v.toFixed(2).replace('.', ',')
const sign = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1).replace('.', ',')}`
const code = (g: Game, id: number) => (g.clubs[id].code ?? g.clubs[id].short).slice(0, 3).toUpperCase()

export function DataCenter({ tab }: { tab?: string }) {
  const { g, nav } = useGame()
  const [t0, setT] = useSticky('dc.tab', 'equipo')
  const cur = tab ?? t0
  return (
    <div className="page">
      <div className="row wrap"><h2 className="grow">Centro de datos</h2><span className="dim sm">Temporada {g.season} · datos de los partidos jugados</span></div>
      <div className="tabs">{TABS.map(([k, l]) => <button key={k} className={cur === k ? 'on' : ''} onClick={() => { setT(k); nav({ page: 'data', tab: k }) }}>{l}</button>)}</div>
      {cur === 'equipo' && <TeamView clubId={g.userClubId} />}
      {cur === 'jugadores' && <PlayersView />}
      {cur === 'rivales' && <RivalsView />}
      {cur === 'liga' && <LeagueView />}
    </div>
  )
}

// ---------- cifras con su lugar en la categoría ----------
function Stat({ label, value, rank, of, note }: { label: string; value: string; rank?: number; of?: number; note?: string }) {
  return <div className="stat"><span className="stat-l">{label}</span><span className="stat-v">{value}</span>
    <span className="dim sm">{rank != null && of ? `${rank}.º de ${of}` : ''}{note ? `${rank != null ? ' · ' : ''}${note}` : ''}</span></div>
}
function rankOf(rows: LeagueRow[], clubId: number, k: (r: LeagueRow) => number, asc = false) {
  const s = [...rows].sort((a, b) => (asc ? k(a) - k(b) : k(b) - k(a)))
  const i = s.findIndex(r => r.clubId === clubId)
  return i < 0 ? undefined : i + 1
}
function Tiles({ clubId, rows }: { clubId: number; rows: MatchRow[] }) {
  const { g } = useGame()
  const s = summary(rows), lr = leagueRows(g, g.clubs[clubId].division), n = lr.length
  const r = (k: (x: LeagueRow) => number, asc = false) => rankOf(lr, clubId, k, asc)
  return <div className="stats-row">
    <Stat label="Puntos por partido" value={f2(s.ppg)} rank={r(x => x.ppg)} of={n} />
    <Stat label="xG a favor por partido" value={f2(s.xg)} rank={r(x => x.xg)} of={n} />
    <Stat label="xG en contra por partido" value={f2(s.xga)} rank={r(x => x.xga, true)} of={n} note="menos es mejor" />
    <Stat label="Definición (goles − xG)" value={sign(s.finishing)} rank={r(x => x.finishing)} of={n} note={s.finishing >= 0 ? 'convierte más de lo esperado' : 'convierte menos de lo esperado'} />
    <Stat label="Posesión media" value={`${Math.round(s.poss)} %`} rank={r(x => x.poss)} of={n} />
    <Stat label="Remates por partido" value={fmtN(+s.shots.toFixed(1))} rank={r(x => x.shots)} of={n} />
  </div>
}
function xgChart(g: Game, rows: MatchRow[], title: string) {
  return <ChartCard title={title} sub="Cada par de columnas es un partido: lo que generó el equipo y lo que le generaron."
    legend={[{ name: 'xG a favor', color: SERIES.s1 }, { name: 'xG en contra', color: SERIES.s2 }]}
    table={{ head: ['Partido', 'Resultado', 'xG a favor', 'xG en contra'], rows: rows.map(r => [`${fmtDate(r.f.date)} · ${r.home ? 'vs' : 'en'} ${g.clubs[r.opp].short}`, `${r.gf}-${r.gc} (${r.res})`, +r.xg.toFixed(2), +r.xga.toFixed(2)]) }}>
    <Columns cats={rows.map(r => code(g, r.opp))} series={[{ name: 'xG a favor', color: SERIES.s1, values: rows.map(r => r.xg) }, { name: 'xG en contra', color: SERIES.s2, values: rows.map(r => r.xga) }]}
      xLabel={i => <span>{fmtDate(rows[i].f.date)} · {rows[i].home ? 'vs' : 'en'} <b>{g.clubs[rows[i].opp].short}</b></span>}
      tip={i => <div className="sm" style={{ marginTop: 4 }}>Resultado <b>{rows[i].gf}-{rows[i].gc}</b> · {g.comps[rows[i].f.comp]?.name.replace(/ \d{4}$/, '')}</div>} />
  </ChartCard>
}
function binsChart(bins: { gf: number[]; gc: number[] }, title: string) {
  return <ChartCard title={title} sub="Tramos de 15 minutos; el último incluye el descuento."
    legend={[{ name: 'A favor', color: SERIES.s1 }, { name: 'En contra', color: SERIES.s2 }]}
    table={{ head: ['Tramo', 'A favor', 'En contra'], rows: BINS.map((b, i) => [b, bins.gf[i], bins.gc[i]]) }}>
    <Columns cats={BINS} series={[{ name: 'A favor', color: SERIES.s1, values: bins.gf }, { name: 'En contra', color: SERIES.s2, values: bins.gc }]} height={180} fmt={v => String(Math.round(v))} int />
  </ChartCard>
}

// ---------- mi equipo ----------
function TeamView({ clubId }: { clubId: number }) {
  const { g } = useGame()
  const rows = matchRows(g, clubId)
  if (!rows.length) return <Empty />
  const c = g.clubs[clubId], comp = compOf(g, clubId)
  const table = tableOf(leagueFx(g, comp), clubsIn(g, c.division, c.zone))
  const rival = table[0]?.clubId === clubId ? table[1]?.clubId : table[0]?.clubId
  const race = rival != null ? pointsRace(g, clubId, rival) : null
  const sec = sectors(g, clubId), n = Math.max(1, sec.n)
  return <>
    <Tiles clubId={clubId} rows={rows} />
    <div className="dash">
      <div className="s8">{xgChart(g, rows, 'xG por partido')}</div>
      <div className="s4">{race && <ChartCard title="Carrera en la tabla" sub={`Puntos acumulados en el ${g.comps[comp]?.name.replace(/ \d{4}$/, '')}, contra ${table[0]?.clubId === clubId ? 'el escolta' : 'el líder'} de tu zona.`}
        legend={[{ name: c.short, color: SERIES.s1, line: true }, { name: g.clubs[rival!].short, color: SERIES.s2, line: true }]}
        table={{ head: ['Fecha', c.short, g.clubs[rival!].short], rows: race.me.map((v, i) => [`Fecha ${i + 1}`, v, race.leader[i] ?? '–']) }}>
        <Lines cats={race.me.map((_, i) => `F${i + 1}`)} series={[{ name: c.short, color: SERIES.s1, values: race.me }, { name: g.clubs[rival!].short, color: SERIES.s2, values: race.leader }]} fmt={v => String(Math.round(v))} int xLabel={i => `Fecha ${i + 1}`} />
      </ChartCard>}</div>
      <div className="s4"><ChartCard title="Peligro por sector" sub={`xG por partido. "En contra" es el sector de tu defensa por donde te atacan. ${sec.n} partidos con análisis.`}
        legend={[{ name: 'A favor', color: SERIES.s1 }, { name: 'En contra', color: SERIES.s2 }]}
        table={{ head: ['Sector', 'Ataques por partido', 'xG a favor', 'xG en contra'], rows: ['Izquierda', 'Centro', 'Derecha'].map((l, i) => [l, +(sec.att[i] / n).toFixed(1), +(sec.xg[i] / n).toFixed(2), +(sec.xgA[i] / n).toFixed(2)]) }}>
        <HBars labelW={84} cats={['Izquierda', 'Centro', 'Derecha']} series={[{ name: 'A favor', color: SERIES.s1, values: sec.xg.map(v => v / n) }, { name: 'En contra', color: SERIES.s2, values: sec.xgA.map(v => v / n) }]} fmt={f2} />
      </ChartCard></div>
      <div className="s4"><ChartCard title="Dónde se pierde la pelota" sub="Pérdidas por partido en cada fase de la jugada."
        legend={[{ name: c.short, color: SERIES.s1 }, { name: 'Rivales', color: SERIES.s2 }]}
        table={{ head: ['Fase', c.short, 'Rivales'], rows: ['Salida', 'Elaboración', 'Último tercio'].map((l, i) => [l, +(sec.lost[i] / n).toFixed(1), +(sec.lostOpp[i] / n).toFixed(1)]) }}>
        <HBars labelW={104} cats={['Salida', 'Elaboración', 'Último tercio']} series={[{ name: c.short, color: SERIES.s1, values: sec.lost.map(v => v / n) }, { name: 'Rivales', color: SERIES.s2, values: sec.lostOpp.map(v => v / n) }]} fmt={v => v.toFixed(1).replace('.', ',')} />
      </ChartCard></div>
      <div className="s4">{binsChart(goalsByBin(g, clubId), 'Goles por tramo')}</div>
    </div>
  </>
}

// ---------- jugadores ----------
function PlayersView() {
  const { g, openPlayer } = useGame()
  const [sort, setSort] = useSticky('dc.psort', 'mins')
  const use = playerUse(g, g.userClubId)
  if (!use.some(u => u.apps)) return <Empty />
  const key: Record<string, (u: (typeof use)[0]) => number> = { mins: u => u.mins, rat: u => (u.apps >= 2 ? u.rat : 0), ga: u => (u.mins >= 180 ? u.ga90 : 0), m30: u => u.mins30 }
  const list = [...use].sort((a, b) => key[sort](b) - key[sort](a))
  const risk = use.filter(u => u.risk)
  // promedio por línea, con los puestos que de verdad ocuparon
  const lines: [string, string[]][] = [['Arqueros', ['GK']], ['Defensores', ['DR', 'DC', 'DL']], ['Mediocampistas', ['DM', 'MC', 'MR', 'ML', 'AMC']], ['Delanteros', ['AMR', 'AML', 'ST']]]
  const byLine = lines.map(([, ps]) => { const xs = use.flatMap(u => u.byPos.filter(b => ps.includes(b.pos)).map(b => [b.rat * b.n, b.n])); const n = xs.reduce((s, x) => s + x[1], 0); return n ? xs.reduce((s, x) => s + x[0], 0) / n : 0 })
  return <>
    <div className="stats-row">
      <Stat label="Jugadores usados" value={String(use.filter(u => u.apps).length)} note={`de ${use.length} en el plantel`} />
      <Stat label="Con desgaste" value={String(risk.length)} note={risk.length ? risk.slice(0, 3).map(u => u.p.name.split(' ').slice(-1)[0]).join(', ') : 'nadie en riesgo'} />
      <Stat label="Mejor promedio" value={(() => { const b = use.filter(u => u.apps >= 3).sort((a, b) => b.rat - a.rat)[0]; return b ? `${b.rat.toFixed(2).replace('.', ',')}` : '–' })()} note={use.filter(u => u.apps >= 3).sort((a, b) => b.rat - a.rat)[0]?.p.name ?? 'con 3 partidos o más'} />
    </div>
    <div className="dash">
      <div className="card s12 col" style={{ gap: 8 }}>
        <div className="row between"><h3>Uso y rendimiento del plantel</h3><div className="seg">{([['mins', 'Minutos'], ['rat', 'Promedio'], ['ga', 'G+A por 90'], ['m30', 'Últimos 30 días']] as const).map(([k, l]) => <button key={k} className={sort === k ? 'on' : ''} onClick={() => setSort(k)}>{l}</button>)}</div></div>
        <table className="dc-table"><thead><tr><th>Jugador</th><th>Pos</th><th className="r">PJ</th><th className="r">Min</th><th className="r">Prom</th><th className="hide-md">Últimos puntajes</th><th className="r">G+A/90</th><th className="hide-md">Puestos que ocupó</th><th>Últimos 5 (min)</th><th>Min. 30 días</th><th>Físico</th></tr></thead>
          <tbody>{list.map(u => (
            <tr key={u.p.id} data-pid={u.p.id} className="click" onClick={() => openPlayer(u.p.id)}>
              <td><span className="row" style={{ gap: 8 }}><Face p={u.p} size={24} /><span className="ell" style={{ fontWeight: 600 }}>{u.p.name}</span>{u.risk && <span className="chip warn" title="Muchos minutos recientes con el físico bajo o con edad: riesgo de lesión y de bajo rendimiento">⚠ Desgaste</span>}</span></td>
              <td><PosPill p={u.p} /></td><td className="r num">{u.apps}</td><td className="r num dim">{u.mins}</td>
              <td className={`r num ${u.apps ? ratClass(u.rat) : 'dim'}`}>{u.apps ? u.rat.toFixed(2).replace('.', ',') : '–'}</td>
              <td className="hide-md">{u.ratings.length >= 2 ? <Spark values={u.ratings} w={84} h={22} /> : <span className="dim sm">–</span>}</td>
              <td className="r num">{u.mins >= 90 ? u.ga90.toFixed(2).replace('.', ',') : <span className="dim">–</span>}</td>
              <td className="sm hide-md">{u.byPos.slice(0, 2).map(b => <span key={b.pos} className="chip" style={{ marginRight: 4 }} title={`${b.n} partidos de ${POS_LABEL[b.pos]}`}>{POS_LABEL[b.pos]} <b className={ratClass(b.rat)}>{b.rat.toFixed(1).replace('.', ',')}</b></span>)}</td>
              <td><span className="row" style={{ gap: 2 }} title={u.last5.join(' · ')}>{u.last5.map((m, i) => <span key={i} className="pip" style={{ height: 4 + (m / 90) * 14, opacity: m ? 1 : 0.25 }} />)}</span></td>
              <td><span className="row" style={{ gap: 6 }}><Meter v={u.mins30} max={540} color={u.risk ? 'var(--warn)' : SERIES.s1} /><span className="num dim sm">{u.mins30}</span></span></td>
              <td><Cond v={u.p.cond} /></td>
            </tr>))}</tbody></table>
      </div>
      <div className="s5">
        <ChartCard title="Promedio por línea" sub="Puntaje medio en los puestos que ocuparon de verdad."
          table={{ head: ['Línea', 'Promedio'], rows: lines.map(([l], i) => [l, byLine[i] ? +byLine[i].toFixed(2) : '–']) }}>
          <HBars cats={lines.map(([l]) => l)} series={[{ name: 'Promedio', color: SERIES.s1, values: byLine }]} fmt={v => (v ? v.toFixed(2).replace('.', ',') : '–')} labelW={118} />
        </ChartCard>
      </div>
      <div className="s7"><div className="card col sm dim" style={{ gap: 6 }}><h3>Cómo leerlo</h3><span>"Desgaste" marca a quien sumó más de 420 minutos en 30 días (partidos entre semana) sin recuperar el físico, o a los mayores de 32 con 450 minutos o más: conviene rotarlos.</span><span>Las barritas de "Últimos 5" son los minutos de cada uno de los últimos cinco partidos.</span><span>"Puestos que ocupó" muestra dónde jugó de verdad y con qué promedio: sirve para ver si rinde más en otro puesto.</span></div>
      </div>
    </div>
  </>
}

// ---------- rivales ----------
const STYLE: [keyof Game['clubs'][number]['tactic'], string[]][] = [['pressing', ['Presión baja', 'Presión media', 'Presión alta']], ['tempo', ['Ritmo lento', 'Ritmo normal', 'Ritmo rápido']], ['width', ['Juego cerrado', 'Ancho normal', 'Juego abierto']], ['line', ['Línea baja', 'Línea media', 'Línea adelantada']], ['passing', ['Salida corta', 'Salida mixta', 'Salida larga']]]
function RivalsView() {
  const { g, openClub, openPlayer } = useGame()
  const next = nextUserFixture(g)
  const def = next ? (next.home === g.userClubId ? next.away : next.home) : Object.values(g.clubs).find(c => c.division === g.clubs[g.userClubId].division && c.id !== g.userClubId)!.id
  const [id, setId] = useSticky<number>('dc.rival', def)
  const c = g.clubs[id] ?? g.clubs[def], rows = matchRows(g, c.id)
  const st = { ...c.tactic, ...(c.style ?? {}) } as Game['clubs'][number]['tactic']
  const top = squadOf(g, c.id).filter(p => p.stats.apps + p.stats.subs >= 2).sort((a, b) => b.stats.ratSum / (b.stats.apps + b.stats.subs) - a.stats.ratSum / (a.stats.apps + a.stats.subs)).slice(0, 6)
  const scorers = squadOf(g, c.id).filter(p => p.stats.goals).sort((a, b) => b.stats.goals - a.stats.goals).slice(0, 4)
  return <>
    <div className="card row wrap" style={{ gap: 14 }}>
      <Badge club={c} size={48} />
      <div className="grow"><button className="linkish" onClick={() => openClub(c.id)}><h2 style={{ textTransform: 'none' }}>{c.name}</h2></button>
        <div className="row wrap" style={{ gap: 6, marginTop: 4 }}><span className="chip acc">{c.tactic.formation}</span>{STYLE.map(([k, l]) => <span key={k} className="chip">{l[(st[k] as number) ?? 1]}</span>)}<span className="dim sm">DT {c.manager}</span></div></div>
      <label className="f">Rival a analizar<select value={c.id} onChange={e => setId(Number(e.target.value))}>
        {next && <option value={def}>Próximo rival: {g.clubs[def].name}</option>}
        {[1, 2, 3, 0].map(d => <optgroup key={d} label={['Exterior', 'Liga Profesional', 'Primera Nacional', 'Primera B y Federal A'][d]}>{Object.values(g.clubs).filter(x => x.division === d && x.id !== g.userClubId).sort((a, b) => a.name.localeCompare(b.name)).map(x => <option key={x.id} value={x.id}>{x.name}</option>)}</optgroup>)}
      </select></label>
    </div>
    {!rows.length ? <Empty text={`${c.name} todavía no jugó partidos esta temporada.`} /> : <>
      <Tiles clubId={c.id} rows={rows} />
      <div className="dash">
        <div className="s8">{xgChart(g, rows, `xG por partido de ${c.short}`)}</div>
        <div className="card s4 col"><h3>Últimos resultados</h3>{rows.slice(-6).reverse().map(r => <div key={r.f.id} className="row sm" style={{ gap: 8 }}><span className={`chip ${r.res === 'G' ? 'acc' : r.res === 'P' ? 'bad' : ''}`} style={{ minWidth: 26, justifyContent: 'center' }}>{r.res}</span><Badge club={g.clubs[r.opp]} size={18} /><span className="grow ell">{r.home ? 'vs' : 'en'} {g.clubs[r.opp].short}</span><b className="num">{r.gf}-{r.gc}</b><span className="dim num">xG {f2(r.xg)}-{f2(r.xga)}</span></div>)}</div>
        <div className="s4">{binsChart(goalsByBin(g, c.id), `Goles por tramo de ${c.short}`)}</div>
        <div className="card s4 col"><h3>Figuras de la temporada</h3>{top.map(p => <button key={p.id} className="linkish row" data-pid={p.id} onClick={() => openPlayer(p.id)} style={{ gap: 8 }}><Face p={p} size={26} /><span className="grow ell">{p.name}</span><PosPill p={p} /><b className={`num ${ratClass(p.stats.ratSum / (p.stats.apps + p.stats.subs))}`}>{avgRat(p.stats)}</b></button>)}{!top.length && <span className="dim sm">Sin datos todavía.</span>}</div>
        <div className="card s4 col"><h3>Goleadores</h3>{scorers.map(p => <button key={p.id} className="linkish row" data-pid={p.id} onClick={() => openPlayer(p.id)} style={{ gap: 8 }}><Face p={p} size={26} /><span className="grow ell">{p.name}</span><b className="num">{p.stats.goals}</b></button>)}{!scorers.length && <span className="dim sm">Todavía no convirtió nadie.</span>}</div>
      </div>
    </>}
  </>
}

// ---------- liga ----------
function LeagueView() {
  const { g, openClub } = useGame()
  const [div, setDiv] = useSticky(`dc.div.${g.userClubId}`, g.clubs[g.userClubId].division || 1)
  const [sort, setSort] = useState<{ k: keyof LeagueRow; d: number }>({ k: 'pts', d: -1 })
  const rows = leagueRows(g, div)
  const sorted = [...rows].sort((a, b) => ((a[sort.k] as number) - (b[sort.k] as number)) * sort.d)
  const bins = leagueBins(g, div), gt = bins.reduce((s, v) => s + v, 0)
  const cols: [keyof LeagueRow, string, (r: LeagueRow) => ReactNode, string?][] = [
    ['pj', 'PJ', r => r.pj], ['pts', 'Pts', r => <b>{r.pts}</b>], ['xg', 'xG/p', r => f2(r.xg)], ['xga', 'xGC/p', r => f2(r.xga), 'xG en contra por partido'],
    ['xgd', 'Dif. xG', r => <span className={r.xgd > 0.15 ? 'good' : r.xgd < -0.15 ? 'bad' : ''}>{sign(r.xgd)}</span>], ['finishing', 'G − xG', r => sign(r.finishing), 'Goles menos xG en la temporada: positivo, convierte más de lo esperado'],
    ['poss', 'Pos.', r => `${Math.round(r.poss)} %`], ['shots', 'Rem/p', r => r.shots.toFixed(1).replace('.', ',')],
  ]
  return <>
    <div className="row wrap"><div className="seg">{[1, 2, 3].map(d => <button key={d} className={div === d ? 'on' : ''} onClick={() => setDiv(d)}>{['', 'Liga Profesional', 'Primera Nacional', 'Primera B y Federal A'][d]}</button>)}</div>
      <span className="dim sm">Partidos de liga de la temporada {g.season}.</span></div>
    {!rows.length ? <Empty /> : <div className="dash">
      <div className="s7"><ChartCard title="Quién genera y quién concede" sub="Cada punto es un club; en azul, el tuyo. Arriba a la derecha, los que generan mucho y conceden poco. Las líneas marcan el promedio. Clic en un punto para ver el club."
        table={{ head: ['Club', 'xG a favor por partido', 'xG en contra por partido'], rows: rows.map(r => [g.clubs[r.clubId].short, +r.xg.toFixed(2), +r.xga.toFixed(2)]) }}>
        <Scatter pts={rows.map(r => ({ id: r.clubId, x: r.xg, y: r.xga, label: g.clubs[r.clubId].short, hi: r.clubId === g.userClubId, icon: <Badge club={g.clubs[r.clubId]} size={16} />, tip: <div className="sm dim" style={{ marginTop: 4 }}>{r.pts} pts en {r.pj} PJ</div> }))}
          xName="xG a favor por partido" yName="xG en contra por partido" invertY fmt={f2} onPick={openClub} />
      </ChartCard></div>
      <div className="s5">{<ChartCard title="Goles por tramo en la categoría" sub={`${gt} goles. El último tramo incluye el descuento.`}
        table={{ head: ['Tramo', 'Goles', '% del total'], rows: BINS.map((b, i) => [b, bins[i], gt ? Math.round((bins[i] / gt) * 100) : 0]) }}>
        <Columns cats={BINS} series={[{ name: 'Goles', color: SERIES.s1, values: bins }]} height={240} fmt={v => String(Math.round(v))} int />
      </ChartCard>}</div>
      <div className="card s12">
        <table className="dc-table"><thead><tr><th>#</th><th>Club</th>{cols.map(([k, l, , t]) => <th key={k} className="r sortable" title={t ?? ''} onClick={() => setSort({ k, d: sort.k === k ? -sort.d : k === 'xga' ? 1 : -1 })}>{l}{sort.k === k ? (sort.d > 0 ? ' ▴' : ' ▾') : ''}</th>)}</tr></thead>
          <tbody>{sorted.map((r, i) => <tr key={r.clubId} className={r.clubId === g.userClubId ? 'me' : ''}><td className="num dim">{i + 1}</td><td><span className="row" data-cid={r.clubId} style={{ gap: 6 }}><Badge club={g.clubs[r.clubId]} size={20} />{g.clubs[r.clubId].name}</span></td>{cols.map(([k, , f]) => <td key={k} className="r num">{f(r)}</td>)}</tr>)}</tbody></table>
      </div>
    </div>}
  </>
}

function Empty({ text = 'Todavía no hay partidos jugados: los datos aparecen después de la primera fecha.' }: { text?: string }) {
  return <div className="card dim">{text}</div>
}
