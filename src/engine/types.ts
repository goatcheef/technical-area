// Tipos centrales del juego. Todo el estado es JSON serializable.

export type Pos = 'GK' | 'DR' | 'DC' | 'DL' | 'DM' | 'MC' | 'MR' | 'ML' | 'AMC' | 'AMR' | 'AML' | 'ST'
export type Line = 'GK' | 'DF' | 'MF' | 'FW'

/** Orden fijo de atributos (escala 1-20). */
export const ATTRS = [
  'fin', 'pas', 'dri', 'fto', 'cro', 'tck', 'mar', 'hea', 'lsh', 'set',
  'vis', 'dec', 'pos', 'otb', 'com', 'wor', 'agg', 'lea',
  'pac', 'acc', 'sta', 'str', 'jmp',
  'han', 'ref', 'one', 'aer', 'kic',
] as const
export type Attr = (typeof ATTRS)[number]
export const A: Record<Attr, number> = Object.fromEntries(ATTRS.map((a, i) => [a, i])) as Record<Attr, number>

export const ATTR_LABEL: Record<Attr, string> = {
  fin: 'Definición', pas: 'Pases', dri: 'Regate', fto: 'Control', cro: 'Centros', tck: 'Entradas',
  mar: 'Marcaje', hea: 'Cabezazo', lsh: 'Tiros lejanos', set: 'Pelota parada',
  vis: 'Visión', dec: 'Decisiones', pos: 'Colocación', otb: 'Desmarques', com: 'Serenidad',
  wor: 'Sacrificio', agg: 'Agresividad', lea: 'Liderazgo',
  pac: 'Velocidad', acc: 'Aceleración', sta: 'Resistencia', str: 'Fuerza', jmp: 'Salto',
  han: 'Manos', ref: 'Reflejos', one: 'Mano a mano', aer: 'Juego aéreo', kic: 'Saque',
}
export const ATTR_GROUPS: { name: string; attrs: Attr[] }[] = [
  { name: 'Técnicos', attrs: ['fin', 'pas', 'dri', 'fto', 'cro', 'tck', 'mar', 'hea', 'lsh', 'set'] },
  { name: 'Mentales', attrs: ['vis', 'dec', 'pos', 'otb', 'com', 'wor', 'agg', 'lea'] },
  { name: 'Físicos', attrs: ['pac', 'acc', 'sta', 'str', 'jmp'] },
  { name: 'Arquero', attrs: ['han', 'ref', 'one', 'aer', 'kic'] },
]

export interface SeasonStats {
  apps: number; subs: number; mins: number; goals: number; ast: number
  yc: number; rc: number; ratSum: number; motm: number
  shots: number; sot: number; cs: number; conc: number; saves: number
}
export const emptyStats = (): SeasonStats => ({
  apps: 0, subs: 0, mins: 0, goals: 0, ast: 0, yc: 0, rc: 0, ratSum: 0, motm: 0,
  shots: 0, sot: 0, cs: 0, conc: 0, saves: 0,
})

export interface Player {
  id: number
  name: string
  clubId: number
  line: Line
  positions: Pos[] // la primera es la natural
  foot: 'D' | 'I' | 'A'
  birth: string // ISO
  nat: string
  num: number
  attrs: number[]
  ca: number // habilidad actual (1-100)
  pa: number // potencial (1-100)
  value: number // USD
  wage: number // USD por mes
  contractEnd: number // año
  loan: boolean
  youth: boolean
  morale: number // 0-100
  cond: number // estado físico 0-100
  form: number[] // últimos puntajes
  injury: { days: number; desc: string } | null
  susp: number // partidos de suspensión
  ycAcc: number // amarillas acumuladas
  prof: number // profesionalismo 1-20 (oculto)
  stats: SeasonStats
  history: { season: number; clubId: number; stats: SeasonStats }[]
  listed?: boolean // en lista de transferibles
  loanFrom?: number // club dueño del pase si está a préstamo
  gen?: boolean // jugador generado (juvenil de inferiores)
}

export interface Tactic {
  formation: string
  mentality: number // 0 muy defensiva .. 4 muy ofensiva
  pressing: number // 0 baja, 1 media, 2 alta
  tempo: number // 0 lento, 1 normal, 2 rápido
  width: number // 0 cerrado, 1 normal, 2 abierto
  line: number // 0 baja, 1 media, 2 adelantada
  passing: number // salida: 0 corta, 1 mixta, 2 larga
  tackling: number // 0 limpio, 1 normal, 2 fuerte
  focus: number // por dónde atacar: 0 izquierda, 1 centro, 2 derecha, 3 mixto
  finalThird: number // 0 elaborar, 1 mixto, 2 centros, 3 remates de lejos
  onLoss: number // al perderla: 0 replegar, 1 presionar enseguida
  onWin: number // al recuperarla: 0 asegurar, 1 contraatacar
  roles: string[] // rol de cada puesto, en el orden de la formación
  takers: { pen: number; fk: number; corner: number } // 0 = automático
  lineup: number[] // 11 ids en el orden de los puestos de la formación
  bench: number[]
}

export interface Club {
  id: number
  name: string
  short: string
  code: string
  city: string
  stadium: string
  capacity: number
  division: number
  zone: 'A' | 'B'
  rep: number // 1-100
  colors: [string, string]
  manager: string
  tactic: Tactic
  fam: number // familiaridad con el sistema táctico (0-100)
  famKey: string
  balance: number // caja en USD
  budget: number // presupuesto de pases
  wageBudget: number // tope de sueldos mensual
  ledger: Ledger
  /** Puntos y partidos de temporadas anteriores (para promedios). */
  avgHist: { season: number; pts: number; pj: number }[]
}

export interface Ledger { gate: number; tv: number; prizes: number; sales: number; buys: number; wages: number }
export const emptyLedger = (): Ledger => ({ gate: 0, tv: 0, prizes: 0, sales: 0, buys: 0, wages: 0 })

export type MgrAttr = 'att' | 'def' | 'tac' | 'mot' | 'you' | 'neg'
export const MGR_ATTRS: { k: MgrAttr; name: string; help: string }[] = [
  { k: 'att', name: 'Juego ofensivo', help: 'Tu equipo genera más y mejores ocasiones.' },
  { k: 'def', name: 'Orden defensivo', help: 'Tu equipo concede menos remates.' },
  { k: 'tac', name: 'Lectura táctica', help: 'Más control del mediocampo y de la posesión.' },
  { k: 'mot', name: 'Motivación', help: 'El plantel sostiene mejor la moral y se recupera antes de las derrotas.' },
  { k: 'you', name: 'Trabajo con juveniles', help: 'Los jóvenes progresan más rápido y salen mejores camadas.' },
  { k: 'neg', name: 'Negociación', help: 'Pagás menos por los pases y cobrás más por tus ventas.' },
]
export interface Avatar { skin: number; hair: number; hairColor: number; beard: number; glasses: boolean; suit: number }
export interface Manager {
  name: string; nat: string; birthYear: number; avatar: Avatar
  background: string; attrs: Record<MgrAttr, number>; rep: number
  career: { season: number; clubId: number; pj: number; g: number; e: number; p: number; note: string }[]
  cur: { pj: number; g: number; e: number; p: number }
  titles: string[]
}
export interface Board { confidence: number; objective: string; target: number; fired: boolean; offers: number[] }
export interface Offer { id: number; pid: number; from: number; fromName: string; fee: number; date: string; loan?: boolean }
export interface Transfer { date: string; pid: number; name: string; from: string; to: string; fee: number; loan?: boolean }
export type PlayKind = 'open' | 'cross' | 'through' | 'long' | 'corner' | 'fk' | 'pen' | 'counter' | 'aerial'
/** Lo que pasó en el último minuto, para dibujarlo en la cancha. */
export interface Frame { poss: 0 | 1; route: number[]; shot: Shot | null; kind: PlayKind; channel: 0 | 1 | 2; lostTo?: number }
export interface Shot { min: number; side: 0 | 1; pid: number; xg: number; out: 'goal' | 'saved' | 'off' | 'block' | 'post'; x: number; y: number; ast?: number }

export interface MatchStats {
  poss: [number, number]; shots: [number, number]; sot: [number, number]
  xg: [number, number]; passes: [number, number]; passOk: [number, number]
  fouls: [number, number]; corners: [number, number]; offs: [number, number]
  yc: [number, number]; rc: [number, number]
}

export type EvType = 'goal' | 'pen-goal' | 'pen-miss' | 'own' | 'yc' | 'rc' | 'yc2' | 'inj' | 'sub' | 'chance' | 'save' | 'info' | 'post'
export interface MatchEvent {
  min: number
  type: EvType
  side: 0 | 1
  pid?: number
  pid2?: number // asistidor o jugador que entra
  text: string
}

export interface PlayerLine {
  pid: number; side: 0 | 1; started: boolean; mins: number; rating: number
  goals: number; ast: number; shots: number; sot: number; saves: number
  yc: number; rc: number; pos: Pos
}

export interface Fixture {
  id: number
  comp: string // id de la competencia
  stage: string // etiqueta: "Fecha 3", "Octavos"...
  round: number
  date: string
  home: number
  away: number
  neutral?: boolean
  knockout?: boolean
  played: boolean
  hg: number
  ag: number
  pens?: [number, number]
  et?: boolean
  stats?: MatchStats
  events?: MatchEvent[]
  lines?: PlayerLine[]
  shots?: Shot[]
  att?: number
}

export interface Competition {
  id: string // p.ej. "AP", "CL", "PN"
  name: string
  division: number
  /** Fase actual: zonas, eliminatorias, terminada */
  phase: 'league' | 'ko' | 'done'
  koRound: number
  champion?: number
  runnerUp?: number
  extra: Record<string, number | number[] | string>
}

export interface News {
  id: number
  date: string
  title: string
  body: string
  tag: 'partido' | 'torneo' | 'lesion' | 'club' | 'mercado' | 'premio' | 'directiva'
  clubId?: number
  read?: boolean
}

export interface Game {
  version: number
  dbVersion?: number
  seed: number
  rngState: number
  date: string
  season: number
  userClubId: number
  managerName: string
  clubs: Record<number, Club>
  players: Record<number, Player>
  fixtures: Fixture[]
  comps: Record<string, Competition>
  news: News[]
  nextId: number
  honours: { season: number; comp: string; clubId: number }[]
  seasonOver: boolean
  manager: Manager
  board: Board
  offers: Offer[]
  transfers: Transfer[]
  shortlist: number[]
}
