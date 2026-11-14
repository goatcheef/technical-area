import { useRef, useState } from 'react'
import { BACKGROUNDS, PRESETS, baseBudget, distribute } from '../engine/career'
import { DB_CLUBS, fmtDate, newGame } from '../engine/game'
import { MGR_ATTRS, type Avatar, type Game, type Manager, type MgrAttr } from '../engine/types'
import { deleteSave } from '../store'
import { Badge, HAIRS, ManagerFace, Radar, SKINS, SUITS, clubTheme, money } from './common'

const NATS = ['Argentina', 'Uruguay', 'Paraguay', 'Chile', 'Colombia', 'Brasil', 'Bolivia', 'Perú', 'Ecuador', 'Venezuela', 'México', 'España', 'Italia', 'Portugal', 'Otra']
const objective = (rank: number, div: number) => (div === 1 ? (rank <= 3 ? 'Pelear el campeonato' : rank <= 10 ? 'Clasificar a las copas' : rank <= 22 ? 'Mitad de tabla' : 'Mantener la categoría') : rank <= 5 ? 'Ascender a Primera' : rank <= 18 ? 'Clasificar al Reducido' : 'Mitad de tabla')

export function Start({ saved, onStart }: { saved: Game | null; onStart: (g: Game) => void }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [nat, setNat] = useState('Argentina')
  const [age, setAge] = useState(42)
  const [av, setAv] = useState<Avatar>({ skin: 1, hair: 1, hairColor: 1, beard: 0, glasses: false, suit: 0 })
  const [bg, setBg] = useState(1)
  const [preset, setPreset] = useState(0)
  const [attrs, setAttrs] = useState(() => distribute(BACKGROUNDS[1].points, PRESETS[0].attrs))
  const [div, setDiv] = useState(1)
  const [club, setClub] = useState<number | null>(null)
  const [sure, setSure] = useState(false)
  const [bad, setBad] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const framed = window.self !== window.top
  const pts = BACKGROUNDS[bg].points, used = Object.values(attrs).reduce((a, b) => a + b, 0)
  const clubs = DB_CLUBS.filter(c => c.division === div).sort((a, b) => b.rep - a.rep)
  const sel = DB_CLUBS.find(c => c.id === club)
  const rank = sel ? DB_CLUBS.filter(c => c.division === sel.division && c.rep > sel.rep).length + 1 : 0
  const pick = (b: number, p: number) => { setBg(b); setPreset(p); setAttrs(distribute(BACKGROUNDS[b].points, PRESETS[p].attrs)) }
  const bump = (k: MgrAttr, d: number) => { const v = attrs[k] + d; if (v < 1 || v > 20 || (d > 0 && used >= pts)) return; setAttrs({ ...attrs, [k]: v }) }
  const begin = async () => {
    if (!club) return
    if (saved && !sure) { setSure(true); return }
    await deleteSave()
    const m: Manager = { name: name.trim() || 'Director Técnico', nat, birthYear: 2026 - age, avatar: av, background: BACKGROUNDS[bg].id, attrs, rep: BACKGROUNDS[bg].rep, career: [], cur: { pj: 0, g: 0, e: 0, p: 0 }, titles: [] }
    onStart(newGame(club, m))
  }
  const importFile = async (f?: File) => {
    if (!f) return
    try { const g = JSON.parse(await f.text()) as Game; if (!g.clubs || !g.players || g.version !== 6) throw new Error(); onStart(g) } catch { setBad(true) }
  }
  const sw = (list: string[], k: 'skin' | 'hairColor' | 'suit') => <div className="row wrap" style={{ gap: 7 }}>{list.map((c, i) => <button key={c} className={`sw ${av[k] === i ? 'on' : ''}`} aria-pressed={av[k] === i} style={{ background: c }} aria-label={`Opción ${i + 1}`} onClick={() => setAv({ ...av, [k]: i })} />)}</div>
  return (
    <div className="main" style={{ height: '100%', ...(sel ? (clubTheme(sel) as object) : {}) }}>
      <div className="page" style={{ maxWidth: 1120 }}>
        <div className="row wrap" style={{ padding: '18px 0 4px' }}>
          <div className="grow"><div className="brand" style={{ padding: 0 }}>TECHNICAL <i>AREA</i></div><h1 style={{ marginTop: 8 }}>Tu carrera empieza acá</h1>
            <p className="dim" style={{ maxWidth: 620, lineHeight: 1.55, margin: '8px 0 0' }}>Fútbol argentino con clubes y planteles reales. Creá tu director técnico, elegí un club y llevalo a lo más alto.</p></div>
          {saved && saved.version === 6 && (
            <div className="card row" style={{ ...(clubTheme(saved.clubs[saved.userClubId]) as object) }}>
              <Badge club={saved.clubs[saved.userClubId]} size={44} />
              <div><b>{saved.clubs[saved.userClubId].name}</b><div className="dim sm">{saved.managerName} · {fmtDate(saved.date)}</div></div>
              <button className="btn primary" onClick={() => onStart(saved)}>Continuar partida</button>
            </div>)}
        </div>
        <div className="steps">{[0, 1, 2].map(i => <span key={i} className={i <= step ? 'on' : ''} />)}</div>

        {step === 0 && (
          <div className="card col" style={{ gap: 18 }}>
            <h2>1 · Tu perfil</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 24 }} className="pgrid">
              <div className="col center" style={{ alignItems: 'center' }}><ManagerFace a={av} size={150} /><b style={{ fontSize: '1.1rem' }}>{name.trim() || 'Director Técnico'}</b><span className="dim sm">{nat} · {age} años</span></div>
              <div className="col" style={{ gap: 16 }}>
                <div className="row wrap" style={{ alignItems: 'flex-end', gap: 14 }}>
                  <label className="f grow">Nombre y apellido<input id="mgr-name" type="text" placeholder="Ej.: Marcelo Gallardo" value={name} maxLength={32} onChange={e => setName(e.target.value)} /></label>
                  <label className="f">Nacionalidad<select id="mgr-nat" value={nat} onChange={e => setNat(e.target.value)}>{NATS.map(n => <option key={n}>{n}</option>)}</select></label>
                  <label className="f" style={{ minWidth: 170 }}>Edad: {age} años<input id="mgr-age" type="range" min={28} max={72} value={age} onChange={e => setAge(Number(e.target.value))} /></label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 16 }}>
                  <div className="col" style={{ gap: 6 }}><h3>Piel</h3>{sw(SKINS, 'skin')}</div>
                  <div className="col" style={{ gap: 6 }}><h3>Color de pelo</h3>{sw(HAIRS, 'hairColor')}</div>
                  <div className="col" style={{ gap: 6 }}><h3>Traje</h3>{sw(SUITS, 'suit')}</div>
                  <div className="col" style={{ gap: 6 }}><h3>Peinado</h3><div className="seg" role="group" aria-label="Peinado">{['Rapado', 'Corto', 'Al costado', 'Rulos', 'Largo'].map((l, i) => <button key={l} className={av.hair === i ? 'on' : ''} aria-pressed={av.hair === i} onClick={() => setAv({ ...av, hair: i })}>{l}</button>)}</div></div>
                  <div className="col" style={{ gap: 6 }}><h3>Barba</h3><div className="seg" role="group" aria-label="Barba">{['Sin barba', 'Barba', 'Bigote'].map((l, i) => <button key={l} className={av.beard === i ? 'on' : ''} aria-pressed={av.beard === i} onClick={() => setAv({ ...av, beard: i })}>{l}</button>)}</div></div>
                  <div className="col" style={{ gap: 6 }}><h3>Anteojos</h3><div className="seg" role="group" aria-label="Anteojos">{['No', 'Sí'].map((l, i) => <button key={l} className={av.glasses === (i === 1) ? 'on' : ''} aria-pressed={av.glasses === (i === 1)} onClick={() => setAv({ ...av, glasses: i === 1 })}>{l}</button>)}</div></div>
                </div>
              </div>
            </div>
            <div className="row"><span className="grow" /><button className="btn primary cta" onClick={() => setStep(1)}>Siguiente ▸</button></div>
          </div>)}

        {step === 1 && (
          <div className="card col" style={{ gap: 18 }}>
            <h2>2 · Trayectoria y estilo</h2>
            <div className="grid4">{BACKGROUNDS.map((b, i) => (
              <button key={b.id} className={`opt ${bg === i ? 'on' : ''}`} aria-pressed={bg === i} onClick={() => pick(i, preset)}><b>{b.name}</b><span className="dim sm" style={{ lineHeight: 1.45 }}>{b.desc}</span>
                <span className="row sm" style={{ marginTop: 'auto' }}><span className="chip">Prestigio {b.rep}</span><span className="chip acc">{b.points} puntos</span></span></button>))}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 24, alignItems: 'center' }} className="pgrid">
              <div className="col">
                <div className="row wrap"><h3>Estilo</h3><div className="seg" role="group" aria-label="Estilo">{PRESETS.map((p, i) => <button key={p.name} className={preset === i ? 'on' : ''} aria-pressed={preset === i} onClick={() => pick(bg, i)}>{p.name}</button>)}</div>
                  <span className={`chip ${used === pts ? 'acc' : 'warn'}`} style={{ marginLeft: 'auto' }}>{pts - used} puntos libres</span></div>
                {MGR_ATTRS.map(a => (
                  <div key={a.k} className="row" style={{ gap: 12 }}>
                    <div className="grow"><b>{a.name}</b><div className="dim sm">{a.help}</div></div>
                    <button className="btn sm" aria-label={`Bajar ${a.name}`} onClick={() => bump(a.k, -1)}>−</button>
                    <div style={{ width: 120 }}><div className="bar" style={{ height: 8 }}><i style={{ width: `${attrs[a.k] * 5}%`, background: 'var(--accent)' }} /></div></div>
                    <b className="num" style={{ width: 22, textAlign: 'right' }}>{attrs[a.k]}</b>
                    <button className="btn sm" aria-label={`Subir ${a.name}`} onClick={() => bump(a.k, 1)}>+</button>
                  </div>))}
              </div>
              <Radar values={MGR_ATTRS.map(a => attrs[a.k])} labels={['Ataque', 'Defensa', 'Táctica', 'Motivación', 'Juveniles', 'Negociación']} size={260} />
            </div>
            <div className="row"><button className="btn" onClick={() => setStep(0)}>◂ Volver</button><span className="grow" /><button className="btn primary cta" onClick={() => setStep(2)}>Siguiente ▸</button></div>
          </div>)}

        {step === 2 && (
          <div className="card col" style={{ gap: 16 }}>
            <div className="row wrap"><h2 className="grow">3 · Elegí tu club</h2>
              <div className="seg" role="group" aria-label="Categoría">{[1, 2, 3].map(d => <button key={d} className={div === d ? 'on' : ''} aria-pressed={div === d} onClick={() => setDiv(d)}>{['', 'Liga Profesional', 'Primera Nacional', 'Primera B y Federal A'][d]}</button>)}</div></div>
            {sel && (
              <div className="hero row wrap" style={{ gap: 18 }}>
                <Badge club={sel} size={84} />
                <div className="grow"><h1 style={{ fontSize: '2.2rem' }}>{sel.name}</h1><div className="dim">{sel.city} · {sel.stadium} · Zona {sel.zone}</div></div>
                <div className="kpi"><h3>Objetivo</h3><b style={{ fontSize: '1.3rem' }}>{objective(rank, sel.division)}</b></div>
                <div className="kpi"><h3>Presupuesto</h3><b style={{ fontSize: '1.3rem' }}>{money(baseBudget(sel.rep))}</b></div>
                <div className="kpi"><h3>Dificultad</h3><b style={{ fontSize: '1.3rem' }} className={BACKGROUNDS[bg].rep < sel.rep - 25 ? 'warn' : ''}>{BACKGROUNDS[bg].rep < sel.rep - 25 ? 'Poca paciencia' : BACKGROUNDS[bg].rep >= sel.rep ? 'Mucho respaldo' : 'Normal'}</b></div>
              </div>)}
            <div className="clubgrid">{clubs.map(c => (
              <button key={c.id} className={`clubcard ${club === c.id ? 'on' : ''}`} aria-pressed={club === c.id} onClick={() => { setClub(c.id); setSure(false) }}>
                <Badge club={c} size={40} /><span className="grow"><b>{c.name}</b><br /><span className="dim sm">{c.city} · Rep. {c.rep}</span></span></button>))}</div>
            <div className="row wrap"><button className="btn" onClick={() => setStep(1)}>◂ Volver</button>
              {!framed && <button className="btn" onClick={() => file.current?.click()}>Importar partida</button>}{bad && <span className="bad sm">El archivo no es una partida válida.</span>}
              <input ref={file} type="file" accept="application/json" hidden onChange={e => importFile(e.target.files?.[0])} />
              <span className="grow" /><button className="btn primary cta" disabled={!club} onClick={begin}>{sure ? 'Reemplazar la partida guardada ▸' : 'Firmar contrato ▸'}</button></div>
          </div>)}
        <p className="dim sm">Proyecto personal sin fines comerciales. Clubes, escudos, planteles y edades tomados de Wikipedia en español (noviembre de 2026); los atributos son estimaciones propias.</p>
        <style>{`@media (max-width: 800px) { .pgrid { grid-template-columns: 1fr !important; } }`}</style>
      </div>
    </div>
  )
}
