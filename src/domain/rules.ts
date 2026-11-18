// Aturan skor badminton BWF (rally point 21, best of 1 atau 3) sebagai fungsi murni.
// State pertandingan selalu diturunkan dari log event: state = replay(config, events).

export type Side = 'A' | 'B'
export type MatchType = 'singles' | 'doubles'
export type Court = 'right' | 'left'
/** Jumlah game maksimal: best of 1 atau best of 3. */
export type BestOf = 1 | 3

export type MatchEvent =
  | { kind: 'rally'; winner: Side }
  // Tukar posisi kanan/kiri pemain satu tim. Hanya sah di awal game (skor 0-0, ganda).
  | { kind: 'swap'; team: Side }

export interface MatchConfig {
  type: MatchType
  firstServer: Side
  bestOf: BestOf
}

export interface GameScore {
  a: number
  b: number
}

export interface MatchState {
  /** Game yang sudah selesai. */
  games: GameScore[]
  /** Skor game yang sedang berjalan (atau game terakhir jika match selesai). */
  current: GameScore
  /** Indeks game berjalan, mulai 0. */
  gameIndex: number
  gamesWon: { A: number; B: number }
  server: Side
  /**
   * Urutan posisi per tim: pos[team][0] = indeks pemain di kotak kanan, pos[team][1] = kiri.
   * Tunggal selalu [0, 0].
   */
  pos: { A: [number, number]; B: [number, number] }
  /** true jika tim A sedang berada di sisi kanan layar (sudah ganti sisi ganjil kali). */
  ends: boolean
  /** Event terakhir memicu ganti sisi lapangan. */
  sideSwitched: boolean
  /** Event terakhir menutup sebuah game. */
  gameJustEnded: boolean
  finished: boolean
  winner: Side | null
  rallyCount: number
}

export const POINTS_TO_WIN = 21
export const POINT_CAP = 30
export const gamesToWin = (bestOf: BestOf): number => Math.ceil(bestOf / 2)
export const MID_GAME_SWITCH = 11

const other = (s: Side): Side => (s === 'A' ? 'B' : 'A')
const key = (s: Side): 'a' | 'b' => (s === 'A' ? 'a' : 'b')
const initialPos = (type: MatchType): [number, number] => (type === 'doubles' ? [0, 1] : [0, 0])

export function initialState(config: MatchConfig): MatchState {
  return {
    games: [],
    current: { a: 0, b: 0 },
    gameIndex: 0,
    gamesWon: { A: 0, B: 0 },
    server: config.firstServer,
    pos: { A: initialPos(config.type), B: initialPos(config.type) },
    ends: false,
    sideSwitched: false,
    gameJustEnded: false,
    finished: false,
    winner: null,
    rallyCount: 0,
  }
}

export function isGameOver(score: GameScore): boolean {
  const hi = Math.max(score.a, score.b)
  const lo = Math.min(score.a, score.b)
  if (hi >= POINT_CAP) return true
  return hi >= POINTS_TO_WIN && hi - lo >= 2
}

export function gameWinner(score: GameScore): Side | null {
  if (!isGameOver(score)) return null
  return score.a > score.b ? 'A' : 'B'
}

export function isMatchOver(gamesWon: { A: number; B: number }, bestOf: BestOf): boolean {
  const need = gamesToWin(bestOf)
  return gamesWon.A >= need || gamesWon.B >= need
}

/** Satu poin lagi untuk `side` akan menutup game. */
export function isGamePoint(score: GameScore, side: Side): boolean {
  const next = { ...score, [key(side)]: score[key(side)] + 1 }
  return !isGameOver(score) && gameWinner(next) === side
}

export function isMatchPoint(state: MatchState, side: Side, bestOf: BestOf): boolean {
  return !state.finished && isGamePoint(state.current, side) && state.gamesWon[side] === gamesToWin(bestOf) - 1
}

/** Kotak servis: skor tim servis genap = kanan, ganjil = kiri. */
export function serviceCourt(state: MatchState): Court {
  return state.current[key(state.server)] % 2 === 0 ? 'right' : 'left'
}

/** Indeks pemain yang servis dan yang menerima (pemain di kotak diagonal). */
export function serverPosition(state: MatchState): { server: number; receiver: number; court: Court } {
  const court = serviceCourt(state)
  const i = court === 'right' ? 0 : 1
  return {
    server: state.pos[state.server][i],
    receiver: state.pos[other(state.server)][i],
    court,
  }
}

export function canSwap(state: MatchState, type: MatchType): boolean {
  return type === 'doubles' && !state.finished && state.current.a === 0 && state.current.b === 0
}

export function applyEvent(state: MatchState, event: MatchEvent, config: MatchConfig): MatchState {
  if (state.finished) return state
  const s: MatchState = {
    ...state,
    games: state.games,
    current: { ...state.current },
    gamesWon: { ...state.gamesWon },
    pos: { A: [...state.pos.A] as [number, number], B: [...state.pos.B] as [number, number] },
    sideSwitched: false,
    gameJustEnded: false,
  }

  if (event.kind === 'swap') {
    if (!canSwap(state, config.type)) return state
    const p = s.pos[event.team]
    s.pos[event.team] = [p[1], p[0]]
    return s
  }

  const w = event.winner
  s.rallyCount += 1
  s.current[key(w)] += 1

  if (w === s.server) {
    // Tim servis menang rally: server pindah kotak (ganda).
    if (config.type === 'doubles') {
      const p = s.pos[w]
      s.pos[w] = [p[1], p[0]]
    }
  } else {
    // Pindah servis; posisi tidak berubah.
    s.server = w
  }

  const gw = gameWinner(s.current)
  if (gw) {
    s.games = [...state.games, { ...s.current }]
    s.gamesWon[gw] += 1
    s.gameJustEnded = true
    if (isMatchOver(s.gamesWon, config.bestOf)) {
      s.finished = true
      s.winner = gw
      return s
    }
    // Game baru: pemenang servis dulu, posisi kembali ke urutan awal, ganti sisi.
    s.gameIndex += 1
    s.current = { a: 0, b: 0 }
    s.server = gw
    s.pos = { A: initialPos(config.type), B: initialPos(config.type) }
    s.ends = !s.ends
    s.sideSwitched = true
    return s
  }

  // Game penentu: ganti sisi saat salah satu tim pertama kali mencapai 11.
  const lastGame = s.gameIndex === config.bestOf - 1
  if (lastGame && s.current[key(w)] === MID_GAME_SWITCH && s.current[key(other(w))] < MID_GAME_SWITCH) {
    s.ends = !s.ends
    s.sideSwitched = true
  }
  return s
}

export function replay(config: MatchConfig, events: MatchEvent[]): MatchState {
  return events.reduce((st, e) => applyEvent(st, e, config), initialState(config))
}

/** Ringkasan semua game termasuk game berjalan (untuk tampilan dan penyimpanan). */
export function allGames(state: MatchState): GameScore[] {
  if (state.finished) return state.games
  if (state.current.a === 0 && state.current.b === 0) return state.games
  return [...state.games, state.current]
}
