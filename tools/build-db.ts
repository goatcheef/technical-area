// Construye src/data/db.json a partir de data/clubs_raw.json (importado de Wikipedia).
// Los nombres, clubes, edades y puestos de línea son reales; los atributos se estiman.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { Rng, clamp } from '../src/engine/rng'
import { POS_LINE, POS_WEIGHTS, rawRating, ageOn } from '../src/engine/positions'
import { A, ATTRS, type Line, type Pos } from '../src/engine/types'

// [nombre, nombre corto, código, reputación, color1, color2]
type Meta = [string, string, string, number, string, string]
const META: Record<string, Meta> = {
  'Club Atlético River Plate': ['River Plate', 'River', 'RIV', 90, '#ffffff', '#e30613'],
  'Club Atlético Boca Juniors': ['Boca Juniors', 'Boca', 'BOC', 90, '#103f79', '#f3b229'],
  'Racing Club': ['Racing Club', 'Racing', 'RAC', 82, '#75aadb', '#ffffff'],
  'Club Atlético Independiente': ['Independiente', 'Independiente', 'IND', 80, '#e30613', '#ffffff'],
  'Club Atlético San Lorenzo de Almagro': ['San Lorenzo', 'San Lorenzo', 'SLO', 78, '#1b2a5c', '#c8102e'],
  'Club Estudiantes de La Plata': ['Estudiantes (LP)', 'Estudiantes', 'EDL', 80, '#d6001c', '#ffffff'],
  'Club Atlético Vélez Sarsfield': ['Vélez Sarsfield', 'Vélez', 'VEL', 79, '#ffffff', '#1d4f9c'],
  'Club Atlético Rosario Central': ['Rosario Central', 'Central', 'CEN', 78, '#12408f', '#f7d417'],
  'Club Atlético Talleres (Córdoba)': ['Talleres (C)', 'Talleres', 'TAL', 76, '#1a2b57', '#ffffff'],
  'Club Atlético Lanús': ['Lanús', 'Lanús', 'LAN', 76, '#7b1e3a', '#ffffff'],
  'Asociación Atlética Argentinos Juniors': ['Argentinos Juniors', 'Argentinos', 'ARG', 74, '#d6001c', '#ffffff'],
  "Club Atlético Newell's Old Boys": ["Newell's Old Boys", "Newell's", 'NOB', 72, '#d6001c', '#111111'],
  'Club Atlético Huracán': ['Huracán', 'Huracán', 'HUR', 72, '#ffffff', '#d6001c'],
  'Club Atlético Belgrano': ['Belgrano', 'Belgrano', 'BEL', 71, '#6ec1e4', '#ffffff'],
  'Club Social y Deportivo Defensa y Justicia': ['Defensa y Justicia', 'Defensa', 'DYJ', 71, '#ffd400', '#0a7d3b'],
  'Club Sportivo Independiente Rivadavia': ['Independiente Rivadavia', 'Ind. Rivadavia', 'IRV', 70, '#1d4f9c', '#ffffff'],
  'Club de Gimnasia y Esgrima La Plata': ['Gimnasia (LP)', 'Gimnasia', 'GLP', 70, '#ffffff', '#1a2b57'],
  'Club Atlético Unión (Santa Fe)': ['Unión', 'Unión', 'UNI', 68, '#d6001c', '#ffffff'],
  'Club Atlético Tigre': ['Tigre', 'Tigre', 'TIG', 68, '#1d3f8f', '#d6001c'],
  'Club Atlético Banfield': ['Banfield', 'Banfield', 'BAN', 68, '#0a7d3b', '#ffffff'],
  'Club Atlético Platense': ['Platense', 'Platense', 'PLA', 68, '#5a3a22', '#ffffff'],
  'Instituto Atlético Central Córdoba': ['Instituto', 'Instituto', 'INS', 68, '#d6001c', '#ffffff'],
  'Club Atlético Tucumán': ['Atlético Tucumán', 'Atl. Tucumán', 'ATU', 67, '#75aadb', '#ffffff'],
  'Club Atlético Central Córdoba (Santiago del Estero)': ['Central Córdoba (SdE)', 'Central Córdoba', 'CCO', 66, '#111111', '#ffffff'],
  'Club Atlético Barracas Central': ['Barracas Central', 'Barracas', 'BAR', 66, '#d6001c', '#ffffff'],
  'Club Atlético Sarmiento (Junín)': ['Sarmiento (J)', 'Sarmiento', 'SAR', 64, '#0a7d3b', '#ffffff'],
  'Deportivo Riestra': ['Deportivo Riestra', 'Riestra', 'RIE', 63, '#111111', '#ffffff'],
  'Club Atlético Aldosivi': ['Aldosivi', 'Aldosivi', 'ALD', 62, '#0a7d3b', '#ffd400'],
  'Club Atlético Gimnasia y Esgrima (Mendoza)': ['Gimnasia (M)', 'Gimnasia (M)', 'GEM', 62, '#111111', '#ffffff'],
  'Asociación Atlética Estudiantes': ['Estudiantes (RC)', 'Estudiantes (RC)', 'ERC', 60, '#75aadb', '#ffffff'],
  // Primera Nacional
  'Club Deportivo Godoy Cruz Antonio Tomba': ['Godoy Cruz', 'Godoy Cruz', 'GOD', 63, '#1d4f9c', '#ffffff'],
  'Club Atlético Colón': ['Colón', 'Colón', 'COL', 60, '#d6001c', '#111111'],
  'Club Atlético San Martín (San Juan)': ['San Martín (SJ)', 'San Martín (SJ)', 'SMS', 58, '#0a7d3b', '#111111'],
  'Club Atlético San Martín (Tucumán)': ['San Martín (T)', 'San Martín (T)', 'SMT', 58, '#d6001c', '#ffffff'],
  'Club Ferro Carril Oeste': ['Ferro Carril Oeste', 'Ferro', 'FER', 57, '#0a7d3b', '#ffffff'],
  'Quilmes Atlético Club': ['Quilmes', 'Quilmes', 'QUI', 55, '#ffffff', '#1a2b57'],
  'Club Atlético Chacarita Juniors': ['Chacarita Juniors', 'Chacarita', 'CHA', 54, '#d6001c', '#111111'],
  'Club Atlético Atlanta': ['Atlanta', 'Atlanta', 'ATL', 55, '#1d4f9c', '#ffd400'],
  'Club Atlético Patronato de la Juventud Católica': ['Patronato', 'Patronato', 'PAT', 54, '#d6001c', '#111111'],
  'Club Atlético Temperley': ['Temperley', 'Temperley', 'TEM', 54, '#75c8f0', '#ffffff'],
  'Club Deportivo Morón': ['Deportivo Morón', 'Morón', 'MOR', 54, '#d6001c', '#ffffff'],
  'Club Tristán Suárez': ['Tristán Suárez', 'T. Suárez', 'TSU', 53, '#1d4f9c', '#ffffff'],
  'Asociación Mutual Social y Deportiva Atlético de Rafaela': ['Atlético de Rafaela', 'Rafaela', 'RAF', 53, '#f3ead0', '#75aadb'],
  'Club Social y Deportivo Madryn': ['Deportivo Madryn', 'Madryn', 'MAD', 53, '#ffd400', '#111111'],
  'Club Atlético Gimnasia y Esgrima (Jujuy)': ['Gimnasia (J)', 'Gimnasia (J)', 'GEJ', 53, '#75aadb', '#ffffff'],
  'Club Atlético All Boys': ['All Boys', 'All Boys', 'ALL', 52, '#ffffff', '#111111'],
  'Club Almirante Brown': ['Almirante Brown', 'Alte. Brown', 'ALM', 52, '#ffd400', '#111111'],
  'Club Atlético Nueva Chicago': ['Nueva Chicago', 'Chicago', 'CHI', 52, '#0a7d3b', '#111111'],
  'Club Atlético Los Andes': ['Los Andes', 'Los Andes', 'LAN2', 51, '#d6001c', '#ffffff'],
  'Club Deportivo Maipú': ['Deportivo Maipú', 'Maipú', 'MAI', 52, '#d6001c', '#ffffff'],
  'Club de Gimnasia y Tiro': ['Gimnasia y Tiro', 'Gimnasia y Tiro', 'GYT', 52, '#75aadb', '#ffffff'],
  'Club Atlético Estudiantes': ['Estudiantes (BA)', 'Estudiantes (BA)', 'EBA', 51, '#ffffff', '#111111'],
  'Club Almagro': ['Almagro', 'Almagro', 'AMG', 51, '#1d4f9c', '#111111'],
  'Club Agropecuario Argentino': ['Agropecuario', 'Agropecuario', 'AGR', 51, '#0a7d3b', '#d6001c'],
  'Club Atlético Chaco For Ever': ['Chaco For Ever', 'For Ever', 'CFE', 51, '#111111', '#ffffff'],
  'Club Atlético Defensores de Belgrano': ['Defensores de Belgrano', 'Def. Belgrano', 'DEF', 51, '#d6001c', '#111111'],
  'Club Atlético Mitre (Santiago del Estero)': ['Mitre (SdE)', 'Mitre', 'MIT', 50, '#ffd400', '#111111'],
  'Club Atlético Racing': ['Racing (C)', 'Racing (C)', 'RCC', 50, '#75aadb', '#ffffff'],
  'Club Atlético Central Norte (Salta)': ['Central Norte', 'Central Norte', 'CNO', 49, '#111111', '#ffffff'],
  'Club Atlético San Telmo': ['San Telmo', 'San Telmo', 'STE', 49, '#1d4f9c', '#75aadb'],
  'Club Ciudad de Bolívar': ['Ciudad de Bolívar', 'Bolívar', 'BOL', 50, '#75aadb', '#ffffff'],
  'Club Atlético Colegiales (Munro)': ['Colegiales', 'Colegiales', 'CLG', 49, '#1d4f9c', '#d6001c'],
  'Club Atlético Ferrocarril Midland': ['Ferrocarril Midland', 'Midland', 'MID', 49, '#1d4f9c', '#ffffff'],
  'Club Atlético San Miguel': ['San Miguel', 'San Miguel', 'SMI', 48, '#0a7d3b', '#ffffff'],
  'Club Atlético Acassuso': ['Acassuso', 'Acassuso', 'ACA', 48, '#1d4f9c', '#ffffff'],
  'Club Atlético Güemes': ['Güemes (SdE)', 'Güemes', 'GUE', 48, '#1d4f9c', '#d6001c'],
}

const START = '2026-01-10'
const raw = JSON.parse(readFileSync(new URL('../data/clubs_raw.json', import.meta.url), 'utf8')) as any[]
const rng = new Rng(20260110)
const START_YEAR = Number(START.slice(0, 4))

const LINE_POS: Record<Line, [Pos, number][]> = {
  GK: [['GK', 1]],
  DF: [['DC', 0.48], ['DR', 0.26], ['DL', 0.26]],
  MF: [['DM', 0.26], ['MC', 0.42], ['AMC', 0.14], ['MR', 0.09], ['ML', 0.09]],
  FW: [['ST', 0.54], ['AMR', 0.23], ['AML', 0.23]],
}
const SECOND: Partial<Record<Pos, Pos[]>> = {
  DC: ['DM', 'DR', 'DL'], DR: ['MR', 'DC', 'DL'], DL: ['ML', 'DC', 'DR'], DM: ['MC', 'DC'], MC: ['DM', 'AMC', 'MR', 'ML'],
  AMC: ['MC', 'ST', 'AML', 'AMR'], MR: ['AMR', 'DR', 'MC'], ML: ['AML', 'DL', 'MC'], AMR: ['MR', 'AML', 'ST'], AML: ['ML', 'AMR', 'ST'], ST: ['AMR', 'AML', 'AMC'],
}

function genAttrs(pos: Pos, target: number, age: number): number[] {
  const base = 3 + target * 0.15
  const w = POS_WEIGHTS[pos]
  const attrs = ATTRS.map((a, i) => {
    const isGkAttr = i >= A.han
    if (pos === 'GK') {
      if (isGkAttr || w[i] > 0) return base + (w[i] - 2.5) * 0.5 + rng.gauss() * 1.6
      if (['pac', 'acc', 'sta', 'str', 'jmp', 'wor', 'agg', 'lea', 'dec', 'com', 'pas', 'fto', 'vis'].includes(a)) return base - 3.5 + rng.gauss() * 2
      return 2 + rng.next() * 5
    }
    if (isGkAttr) return 1 + rng.next() * 3
    return base + (w[i] - 1.7) * 0.75 + rng.gauss() * 2.1
  })
  // curva física por edad
  const ph = age <= 19 ? -1.2 : age >= 34 ? -2.6 : age >= 31 ? -1.2 : 0
  for (const a of ['pac', 'acc', 'sta'] as const) attrs[A[a]] += ph
  if (age <= 19) attrs[A.str] -= 1.2
  if (age >= 30) { attrs[A.dec] += 1; attrs[A.pos] += 0.8; attrs[A.lea] += 1.5; attrs[A.com] += 0.6 }
  if (age <= 21) { attrs[A.dec] -= 0.8; attrs[A.lea] -= 1.5 }
  let out = attrs.map(v => clamp(Math.round(v), 1, 20))
  // ajuste fino para acercar la valoración al objetivo
  for (let it = 0; it < 40; it++) {
    const diff = target - rawRating(out, pos)
    if (Math.abs(diff) < 0.6) break
    const cand = out.map((_, i) => i).filter(i => w[i] > 0 && (diff > 0 ? out[i] < 20 : out[i] > 1))
    if (!cand.length) break
    const i = rng.weighted(cand, c => w[c])
    out[i] += diff > 0 ? 1 : -1
  }
  return out
}

// Señales reales por jugador (tools/fetch_players.py) y correcciones manuales (data/overrides.json)
const load = (f: string) => { try { return JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8')) } catch { return {} } }
const PMETA = load('../data/players_meta.json') as Record<string, { ok: boolean; pos?: string; debut?: number | null; caps?: number; youthcaps?: boolean; clubs?: number; foreign?: number; len?: number }>
/** Clave "Club corto|Nombre" → { ca?: número 30-93, pos?: puesto natural } */
const OVERRIDES = load('../data/overrides.json') as Record<string, { ca?: number; pos?: Pos; prospect?: number }>
/** Juveniles convocados a selecciones juveniles (tools/prospects.py). Clave: 'título wiki del club|Nombre'. */
const PROSPECTS = load('../data/prospects.json') as Record<string, { score: number; sel: string[] }>
const POS_RX: [RegExp, Pos | 'WING' | 'FB' | 'FWG' | 'MFG'][] = [
  [/arquer|guardamet|porter/, 'GK'], [/lateral derech|carrilero derech|lateral por (la )?derecha/, 'DR'], [/lateral izquierd|carrilero izquierd|lateral por (la )?izquierda/, 'DL'], [/lateral|carrilero/, 'FB'],
  [/mediocentro|volante central|pivote|contenci[oó]n|(mediocamp\w*|centrocamp\w*|volante) defensivo|volante tap[oó]n/, 'DM'], [/central|zaguer|l[ií]bero|defens/, 'DC'],
  [/mediapunta|media punta|enganche|ofensivo|creativo|segundo delantero/, 'AMC'], [/extremo derech|puntero derech/, 'AMR'], [/extremo izquierd|puntero izquierd/, 'AML'], [/extremo|puntero|wing/, 'WING'],
  [/(volante|interior|mediocampista|centrocampista) (por )?(la )?derech/, 'MR'], [/(volante|interior|mediocampista|centrocampista) (por )?(la )?izquierd/, 'ML'],
  [/centrodelanter|delantero centro|delantero de [aá]rea|ariete|\bnueve\b|goleador/, 'ST'], [/delanter|atacante|punta/, 'FWG'], [/mediocamp|centrocamp|volante|interior/, 'MFG'],
]
let alt = 0
/** 'delantero' o 'mediocampista' a secas no dicen el puesto: se reparten entre los puestos de esa línea. */
const GEN_FW: Pos[] = ['ST', 'AMR', 'ST', 'AML', 'ST', 'AMR', 'AML'], GEN_MF: Pos[] = ['MC', 'DM', 'MC', 'AMC', 'MC', 'MR', 'DM', 'ML', 'AMC']
let gf = 0, gm = 0
function parsePositions(text: string | undefined): Pos[] {
  if (!text) return []
  const out: Pos[] = []
  for (const seg of text.split(/\/|,| o | y |;|<br/)) {
    const hit = POS_RX.find(([rx]) => rx.test(seg))
    if (!hit) continue
    const pos: Pos = hit[1] === 'WING' ? (alt++ % 2 ? 'AML' : 'AMR') : hit[1] === 'FB' ? (alt++ % 2 ? 'DL' : 'DR') : hit[1] === 'FWG' ? GEN_FW[gf++ % GEN_FW.length] : hit[1] === 'MFG' ? GEN_MF[gm++ % GEN_MF.length] : hit[1]
    if (!out.includes(pos)) out.push(pos)
  }
  return out.slice(0, 3)
}
/** Ajuste de habilidad según trayectoria real: selección, paso por el exterior, años de carrera y notoriedad. */
function merit(p: any, age: number): number {
  const m = PMETA[p.wiki ?? '']
  if (!m?.ok) return age >= 24 ? -5 : -3
  const years = m.debut ? START_YEAR - m.debut : Math.max(0, age - 20)
  const total = clamp((Math.log10(Math.max(1500, m.len ?? 1500)) - 3.9) * 7, -4, 6) + Math.min(6, (m.caps ?? 0) * 0.5) + (m.youthcaps ? 1.5 : 0)
    + Math.min(3, (m.foreign ?? 0) * (age >= 27 ? 1 : 0.4)) + (years <= 2 ? -3 : years <= 5 ? 0 : 1.5)
  return Math.min(9, total) + present(p, age)
}
const SPECIFIC = /lateral|carriler|central|zaguer|l[ií]bero|extremo|puntero|enganche|media ?punta|ofensivo|defensivo|pivote|mediocentro|volante central|contenci|centrodelanter|delantero centro|nueve|ariete|interior/
/** Presente: partidos jugados en 2026 (tools/fetch_stats.py) frente a lo que juega un titular a esta altura del año. */
const PSTATS = load('../data/players_stats.json') as Record<string, { upd?: number | null; a26?: number; a25?: number; g26?: number; car?: number; lead?: string | null } | null>
function present(p: any, age: number): number {
  const st = PSTATS[p.wiki ?? '']
  if (!st || st.a26 == null) return 0 // sin tabla de estadísticas: no se sabe
  const fresh = (st.upd ?? 0) >= 2026
  const apps = fresh ? st.a26 : (st.a25 ?? 0) * 0.8
  let f = (Math.min(1, apps / 30) - 0.45) * 8 * (fresh ? 1 : 0.5)
  if (age <= 20) f = Math.max(f, -1) // a los pibes no se les exige jugar
  const exp = age >= 22 ? clamp(Math.log10(Math.max(10, st.car ?? 10)) - 2, -1, 0.6) * 2 : 0
  return f + exp
}

const clubs: any[] = []
const players: any[] = []
let pid = 1
raw.forEach((c, idx) => {
  const m = META[c.wiki]
  if (!m) throw new Error('Falta meta para ' + c.wiki)
  const div = c.division as number
  const ppg = c.ppg2026 ?? 1.3
  const rep = clamp(Math.round(m[3] + (ppg - 1.35) * (div === 1 ? 5 : 6)), 40, 95)
  const id = idx + 1
  const mgr = (c.manager || '').replace(/'/g, '').trim()
  clubs.push({
    id, name: m[0], short: m[1], code: m[2].slice(0, 3), city: c.city, stadium: c.stadium, capacity: c.capacity,
    division: div, zone: c.zone, rep, colors: [m[4], m[5]],
    manager: !mgr || /vacante/i.test(mgr) ? 'Cuerpo técnico interino' : mgr,
    ppg: ppg, pj: div === 1 ? 32 : 34,
  })
  const squadMean = 31 + rep * 0.5
  const PATTERN: Record<Line, Pos[]> = {
    GK: ['GK'], DF: ['DC', 'DR', 'DL', 'DC', 'DC', 'DR', 'DL', 'DC'],
    MF: ['MC', 'DM', 'MC', 'AMC', 'DM', 'MR', 'ML', 'MC', 'DM', 'AMC'], FW: ['ST', 'AMR', 'AML', 'ST', 'ST', 'AMR', 'AML'],
  }
  const cnt: Record<Line, number> = { GK: 0, DF: 0, MF: 0, FW: 0 }
  const used = new Set<number>()
  const list = (c.players as any[]).slice(0, 44)
  for (const p of list) if (p.num && p.num < 100) { if (used.has(p.num)) p.num = null; else used.add(p.num) }
  // primera pasada: habilidad objetivo; se normaliza para que el once titular refleje la reputación
  const birthOf = (p: any): string => (p.birth ??= `${rng.int(1994, 2005)}-${String(rng.int(1, 12)).padStart(2, '0')}-${String(rng.int(1, 28)).padStart(2, '0')}`)
  for (const p of list) {
    const age = ageOn(birthOf(p), START)
    const ageAdj = age <= 17 ? -13 : age === 18 ? -10 : age <= 20 ? -6.5 : age <= 22 ? -3 : age <= 31 ? 1 : age <= 33 ? -0.5 : age <= 35 ? -2.5 : -5
    const numAdj = p.num && p.num <= 11 ? 1 : p.num && p.num >= 35 ? -1.5 : 0
    const mm = PMETA[p.wiki ?? '']
    p.pr = Math.max(OVERRIDES[`${m[1]}|${p.name}`]?.prospect ?? 0, PROSPECTS[`${c.wiki}|${p.name}`]?.score ?? 0, mm?.ok && mm.youthcaps && age <= 22 ? 2.5 : 0)
    p.t = squadMean + p.pr * (age <= 18 ? 1.5 : 1) + ageAdj + numAdj + (p.captain ? 3 : 0) + (p.loan ? 1 : 0) + (p.nat !== 'Argentina' ? 1 : 0) + merit(p, age) + rng.gauss() * 2.4
    if (p.youth && age <= 20 && !p.num) p.t -= 2
  }
  const top = list.map(p => p.t as number).sort((a, b) => b - a).slice(0, 14)
  const shiftCa = 35.5 + rep * 0.5 - top.reduce((a, b) => a + b, 0) / top.length
  for (const p of list) {
    const line = p.pos as Line
    const birth: string = birthOf(p)
    const age = ageOn(birth, START)
    const ov = OVERRIDES[`${m[1]}|${p.name}`]
    // la primera frase del artículo suele ser más precisa que la ficha ("se desempeña como lateral izquierdo")
    const lead = PSTATS[p.wiki ?? '']?.lead ?? undefined, box = PMETA[p.wiki ?? '']?.ok ? PMETA[p.wiki].pos : undefined
    const specific = (t?: string) => !!t && SPECIFIC.test(t)
    const ptxt = specific(lead) ? `${lead} / ${specific(box) ? box : ''}` : box ?? lead
    let real = ov?.pos ? [ov.pos] : parsePositions(ptxt).filter(x => (x === 'GK') === (line === 'GK'))
    // "delantero" a secas: si en 2026 convierte seguido, es un nueve; si no, se queda como estaba
    const st = PSTATS[p.wiki ?? '']
    if (!ov?.pos && line === 'FW' && !specific(ptxt) && st?.a26 && st.a26 >= 5 && (st as any).g26 / st.a26 >= 0.25) real = ['ST' as Pos, ...real.filter(x => x !== 'ST')].slice(0, 2)
    const pos = real[0] ?? PATTERN[line][cnt[line]++ % PATTERN[line].length]
    const positions: Pos[] = real.length ? [...real] : [pos]
    if (pos !== 'GK' && positions.length === 1 && rng.chance(0.55)) positions.push(rng.pick(SECOND[pos]!))
    if (pos !== 'GK' && !real.length && rng.chance(0.15)) { const e = rng.pick(SECOND[pos]!); if (!positions.includes(e)) positions.push(e) }
    let ca = ov?.ca ?? p.t + shiftCa
    ca = clamp(Math.round(ca), 30, 93)
    const attrs = genAttrs(pos, ca, age)
    const realCa = Math.round(rawRating(attrs, pos))
    let pa = realCa
    if (age <= 23) pa = realCa + Math.round(2 + rng.next() * ((24 - age) * 2.6 + 3) + (rng.chance(0.07) ? 8 : 0))
    else if (age <= 27) pa = realCa + rng.int(0, 3)
    if (p.pr) pa = Math.max(pa, realCa + Math.round(5 + p.pr * 2.2 + rng.next() * 4))
    pa = clamp(pa, realCa, p.pr ? 92 : 96)
    let num = p.num && p.num < 100 ? p.num : 0
    if (!num) { for (let n = pos === 'GK' ? 1 : 2; n < 99; n++) if (!used.has(n)) { num = n; break } used.add(num) }
    players.push({
      id: pid++, name: p.name, clubId: id, line: POS_LINE[pos], positions,
      foot: pos === 'DL' || pos === 'ML' || pos === 'AML' ? (rng.chance(0.75) ? 'I' : 'D') : rng.chance(0.2) ? 'I' : rng.chance(0.06) ? 'A' : 'D',
      birth, nat: p.nat, num, attrs, ca: realCa, pa,
      contractEnd: 2026 + (age >= 33 ? rng.int(0, 1) : rng.int(0, 3)), loan: !!p.loan, youth: !!p.youth,
      prof: clamp(Math.round(11 + rng.gauss() * 3.5), 1, 20),
    })
  }
})

// ---------- clubes sin plantel conocido: tercera categoría y rivales sudamericanos ----------
// Los clubes son reales (data/clubs_extra.json); sus jugadores se generan con nombres ficticios.
const NOM_ES = 'Mateo,Thiago,Bautista,Santino,Benjamín,Joaquín,Valentín,Lautaro,Franco,Tomás,Agustín,Nicolás,Facundo,Ignacio,Santiago,Lucas,Matías,Ramiro,Gonzalo,Federico,Julián,Emiliano,Ezequiel,Bruno,Luciano,Rodrigo,Leandro,Cristian,Iván,Nahuel,Elías,Renzo,Enzo,Alexis,Diego,Sebastián,Pablo,Martín,Andrés,Camilo,Kevin,Brian,Jonathan,Maximiliano,Fernando'.split(',')
const APE_ES = 'González,Rodríguez,Gómez,Fernández,López,Díaz,Martínez,Pérez,García,Sánchez,Romero,Sosa,Torres,Álvarez,Ruiz,Ramírez,Flores,Benítez,Acosta,Medina,Herrera,Suárez,Aguirre,Giménez,Gutiérrez,Pereyra,Rojas,Molina,Castro,Ortiz,Silva,Núñez,Luna,Cabrera,Ríos,Morales,Godoy,Ferreyra,Peralta,Vega,Vera,Ojeda,Cardozo,Navarro,Ramos,Vargas,Cáceres,Correa,Paz,Miranda,Bravo,Toledo,Zárate,Villalba'.split(',')
const NOM_PT = 'Gabriel,Lucas,Matheus,Pedro,Guilherme,Gustavo,Rafael,Felipe,Bruno,João,Vinícius,Thiago,Rodrigo,Caio,Igor,Diego,Leonardo,André,Wesley,Everton,Danilo,Marcos,Renan,Victor,Henrique,Arthur'.split(',')
const APE_PT = 'Silva,Santos,Oliveira,Souza,Lima,Pereira,Ferreira,Costa,Rodrigues,Almeida,Nascimento,Carvalho,Araújo,Ribeiro,Gomes,Martins,Barbosa,Rocha,Dias,Moreira,Cardoso,Teixeira,Correia,Mendes,Freitas,Pinto'.split(',')
const NAT_OF: Record<string, string> = { Brasil: 'Brasil', Uruguay: 'Uruguay', Paraguay: 'Paraguay', Chile: 'Chile', Colombia: 'Colombia', Ecuador: 'Ecuador', Perú: 'Perú', Bolivia: 'Bolivia', Argentina: 'Argentina' }
const GEN_POS: Pos[] = ['GK', 'GK', 'GK', 'DC', 'DC', 'DC', 'DC', 'DC', 'DR', 'DR', 'DL', 'DL', 'DM', 'DM', 'DM', 'MC', 'MC', 'MC', 'MC', 'AMC', 'AMC', 'AMR', 'AMR', 'AML', 'AML', 'ST', 'ST', 'ST']
const extra = JSON.parse(readFileSync(new URL('../data/clubs_extra.json', import.meta.url), 'utf8')) as any[]
for (const c of extra) {
  clubs.push({ id: c.id, name: c.name, short: c.short, code: c.code, city: c.city, stadium: c.stadium || `Estadio de ${c.short}`, capacity: c.capacity, division: c.division, zone: c.zone || 'A', rep: c.rep, colors: c.colors, manager: c.manager, country: c.country, ppg: null, pj: 0 })
  const br = c.country === 'Brasil', n = c.division === 0 ? 23 : 26
  const used = new Set<number>()
  const pos = GEN_POS.filter((_, i) => i < 3 || i >= 3 + (GEN_POS.length - n))
  const mean = 31 + c.rep * 0.5
  for (const pp of pos) {
    const age = rng.int(18, 34)
    const ageAdj = age <= 19 ? -6 : age <= 21 ? -3 : age <= 31 ? 1 : -1
    const ca0 = clamp(Math.round(mean + ageAdj + rng.gauss() * 4), 30, 90)
    const attrs = genAttrs(pp, ca0, age)
    const realCa = Math.round(rawRating(attrs, pp))
    let num = pp === 'GK' ? 1 : 2
    while (used.has(num)) num++
    if (rng.chance(0.4)) { const r = rng.int(2, 40); if (!used.has(r) && pp !== 'GK') num = r }
    used.add(num)
    const positions: Pos[] = [pp]
    if (pp !== 'GK' && rng.chance(0.5)) positions.push(rng.pick(SECOND[pp]!))
    players.push({
      id: pid++, name: `${rng.pick(br ? NOM_PT : NOM_ES)} ${rng.pick(br ? APE_PT : APE_ES)}`, clubId: c.id, line: POS_LINE[pp], positions,
      foot: pp === 'DL' || pp === 'ML' || pp === 'AML' ? 'I' : rng.chance(0.2) ? 'I' : 'D',
      birth: `${2026 - age}-${String(rng.int(1, 12)).padStart(2, '0')}-${String(rng.int(1, 28)).padStart(2, '0')}`,
      nat: rng.chance(0.85) ? NAT_OF[c.country] ?? 'Argentina' : rng.pick(['Argentina', 'Uruguay', 'Paraguay', 'Colombia']),
      num, attrs, ca: realCa, pa: age <= 23 ? clamp(realCa + rng.int(3, 14), realCa, 90) : realCa,
      contractEnd: 2026 + rng.int(0, 3), loan: false, youth: false, gen: true, prof: clamp(Math.round(11 + rng.gauss() * 3.5), 1, 20),
    })
  }
}

mkdirSync(new URL('../src/data/', import.meta.url), { recursive: true })
writeFileSync(new URL('../src/data/db.json', import.meta.url), JSON.stringify({ start: START, dbVersion: Date.now(), clubs, players }))
const cl = new Map(clubs.map(c => [c.id, c]))
const by = (d: number) => players.filter(p => cl.get(p.clubId).division === d)
const avg = (a: any[]) => (a.reduce((s, p) => s + p.ca, 0) / a.length).toFixed(1)
console.log(`clubes ${clubs.length}, jugadores ${players.length}; CA media Primera ${avg(by(1))}, PN ${avg(by(2))}, tercera ${avg(by(3))}, sudamericanos ${avg(by(0))}`)
for (const c of clubs.filter(c => (process.argv[2] ? process.argv[2].split(',') : ['RIV', 'BOC']).includes(c.code))) {
  const sq = players.filter(p => p.clubId === c.id).sort((a, b) => b.ca - a.ca)
  console.log(c.name, 'rep', c.rep, 'top:', sq.slice(0, process.argv[2] ? 40 : 5).map(p => `${p.name} ${p.positions[0]} ${p.ca}/${p.pa}`).join(', '))
}
