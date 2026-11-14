import { BACKGROUNDS, divName, wageBill } from '../engine/career'
import { squadOf } from '../engine/game'
import { ageOn } from '../engine/positions'
import { MGR_ATTRS } from '../engine/types'
import { useGame } from '../store'
import { Badge, Gauge, ManagerFace, Radar, money } from './common'

export function Club() {
  const { g } = useGame()
  const c = g.clubs[g.userClubId], m = g.manager, sq = squadOf(g, c.id)
  const tot = m.career.reduce((s, x) => ({ pj: s.pj + x.pj, g: s.g + x.g, e: s.e + x.e, p: s.p + x.p }), { ...m.cur })
  const titles = g.honours.filter(h => h.clubId === c.id)
  return (
    <div className="page">
      <div className="hero row wrap" style={{ gap: 22 }}>
        <Badge club={c} size={110} />
        <div className="grow"><h3>{divName(c)}{c.division === 1 || c.division === 2 ? ` · Zona ${c.zone}` : ''}</h3><h1 style={{ marginTop: 4 }}>{c.name}</h1><div className="dim">{c.city} · {c.stadium} · {c.capacity.toLocaleString('es-AR')} espectadores</div></div>
        <div className="kpi"><h3>Reputación</h3><b>{c.rep}</b></div><div className="kpi"><h3>Plantel</h3><b>{sq.length}</b></div>
        <div className="kpi"><h3>Edad media</h3><b>{(sq.reduce((s, p) => s + ageOn(p.birth, g.date), 0) / sq.length).toFixed(1)}</b></div><div className="kpi"><h3>Valor</h3><b>{money(sq.reduce((s, p) => s + p.value, 0))}</b></div>
      </div>
      <div className="dash">
        <div className="card s4 col" style={{ alignItems: 'center', textAlign: 'center' }}>
          <ManagerFace a={m.avatar} size={120} /><div><h2>{m.name}</h2><div className="dim sm">{m.nat} · {g.season - m.birthYear} años · {BACKGROUNDS.find(b => b.id === m.background)?.name}</div></div>
          <div className="row" style={{ gap: 18 }}><span className="kpi"><b>{Math.round(m.rep)}</b><span className="dim sm">Prestigio</span></span><span className="kpi"><b>{tot.pj}</b><span className="dim sm">Partidos</span></span><span className="kpi"><b>{tot.pj ? Math.round(((tot.g * 3 + tot.e) / (tot.pj * 3)) * 100) : 0}%</b><span className="dim sm">Efectividad</span></span><span className="kpi"><b>{m.titles.length}</b><span className="dim sm">Títulos</span></span></div>
        </div>
        <div className="card s4 col" style={{ alignItems: 'center' }}><h3 style={{ alignSelf: 'flex-start' }}>Perfil como entrenador</h3>
          <Radar values={MGR_ATTRS.map(a => m.attrs[a.k])} labels={['Ataque', 'Defensa', 'Táctica', 'Motivación', 'Juveniles', 'Negociación']} size={250} /></div>
        <div className="card s4 col" style={{ alignItems: 'center', textAlign: 'center' }}><h3 style={{ alignSelf: 'flex-start' }}>Dirigencia</h3>
          <Gauge v={g.board.confidence} label="CONFIANZA" /><div><b>{g.board.objective}</b><div className="dim sm">Objetivo de la temporada</div></div>
          <div className="dim sm" style={{ lineHeight: 1.5 }}>{g.board.confidence >= 60 ? 'La comisión directiva está conforme con tu trabajo.' : g.board.confidence >= 30 ? 'Hay dudas en la comisión directiva. Los próximos resultados pesan.' : 'Tu puesto corre peligro: necesitás ganar ya.'}</div></div>
        <div className="card s6 col"><h3>Finanzas</h3>
          {[['Caja', c.balance], ['Presupuesto de pases', c.budget], ['Sueldos mensuales', wageBill(g, c.id)], ['Tope salarial', c.wageBudget]].map(([l, v]) => <div key={l as string} className="row between"><span className="dim">{l}</span><b className="num">{money(v as number)}</b></div>)}</div>
        <div className="card s6 col"><h3>Carrera</h3>
          {m.career.length || m.cur.pj ? <table><thead><tr><th>Temp.</th><th>Club</th><th className="r">PJ</th><th className="r">G</th><th className="r">E</th><th className="r">P</th><th>Balance</th></tr></thead><tbody>
            {m.cur.pj > 0 && <tr className="me"><td className="num">{g.season}</td><td>{c.short}</td><td className="r num">{m.cur.pj}</td><td className="r num">{m.cur.g}</td><td className="r num">{m.cur.e}</td><td className="r num">{m.cur.p}</td><td className="dim">En curso</td></tr>}
            {[...m.career].reverse().map((x, i) => <tr key={i}><td className="num">{x.season}</td><td>{g.clubs[x.clubId]?.short}</td><td className="r num">{x.pj}</td><td className="r num">{x.g}</td><td className="r num">{x.e}</td><td className="r num">{x.p}</td><td>{x.note}</td></tr>)}</tbody></table>
            : <div className="dim sm">Tu historial se va a ir armando con cada temporada.</div>}
          {titles.length > 0 && <div className="row wrap">{titles.map((t, i) => <span key={i} className="chip acc">🏆 {t.comp}</span>)}</div>}</div>
      </div>
    </div>
  )
}
