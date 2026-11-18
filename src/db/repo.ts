import { allGames, replay, type BestOf, type MatchConfig, type MatchEvent, type MatchType, type Side } from '../domain/rules'
import { db, type Match, type Slot } from './db'

export function configOf(match: Match): MatchConfig | null {
  return match.firstServer ? { type: match.type, firstServer: match.firstServer, bestOf: match.bestOf ?? 3 } : null
}

export async function loadEvents(matchId: number): Promise<MatchEvent[]> {
  const rows = await db.events.where('[matchId+seq]').between([matchId, -Infinity], [matchId, Infinity]).toArray()
  return rows.map((r) => r.event)
}

/** Hitung ulang ringkasan match dari log event dan simpan ke tabel matches. */
async function syncSummary(matchId: number): Promise<void> {
  const match = await db.matches.get(matchId)
  if (!match) return
  const config = configOf(match)
  if (!config) return
  const state = replay(config, await loadEvents(matchId))
  await db.matches.update(matchId, {
    games: allGames(state),
    status: state.finished ? 'finished' : 'ongoing',
    winner: state.winner,
    endedAt: state.finished ? (match.endedAt ?? Date.now()) : null,
  })
}

export async function createMatch(input: {
  type: MatchType
  quick: boolean
  teamA: Slot[]
  teamB: Slot[]
  firstServer: Side | null
  bestOf: BestOf
}): Promise<number> {
  return db.matches.add({
    ...input,
    status: 'ongoing',
    winner: null,
    games: [],
    startedAt: Date.now(),
    endedAt: null,
  })
}

export function quickSlots(type: MatchType): { teamA: Slot[]; teamB: Slot[] } {
  if (type === 'singles') return { teamA: [{ name: 'Tim A' }], teamB: [{ name: 'Tim B' }] }
  return {
    teamA: [{ name: 'A1' }, { name: 'A2' }],
    teamB: [{ name: 'B1' }, { name: 'B2' }],
  }
}

export async function setFirstServer(matchId: number, side: Side, bestOf: BestOf): Promise<void> {
  await db.matches.update(matchId, { firstServer: side, bestOf })
}

export async function pushEvent(matchId: number, event: MatchEvent): Promise<void> {
  await db.transaction('rw', db.events, db.matches, async () => {
    const last = await db.events.where('[matchId+seq]').between([matchId, -Infinity], [matchId, Infinity]).last()
    await db.events.add({ matchId, seq: (last?.seq ?? 0) + 1, event })
    await syncSummary(matchId)
  })
}

export async function undoEvent(matchId: number): Promise<void> {
  await db.transaction('rw', db.events, db.matches, async () => {
    const last = await db.events.where('[matchId+seq]').between([matchId, -Infinity], [matchId, Infinity]).last()
    if (!last) {
      // Belum ada rally: undo membatalkan pilihan servis pertama.
      await db.matches.update(matchId, { firstServer: null })
      return
    }
    await db.events.delete(last.id)
    await db.matches.update(matchId, { endedAt: null })
    await syncSummary(matchId)
  })
}

export async function deleteMatch(matchId: number): Promise<void> {
  await db.transaction('rw', db.events, db.matches, async () => {
    await db.events.where('matchId').equals(matchId).delete()
    await db.matches.delete(matchId)
  })
}

export async function updateSlots(matchId: number, teamA: Slot[], teamB: Slot[]): Promise<void> {
  await db.matches.update(matchId, { teamA, teamB })
}

export async function addPlayer(name: string): Promise<number> {
  return db.players.add({ name: name.trim(), createdAt: Date.now() })
}

export async function renamePlayer(id: number, name: string): Promise<void> {
  const trimmed = name.trim()
  await db.transaction('rw', db.players, db.matches, async () => {
    await db.players.update(id, { name: trimmed })
    // Perbarui snapshot nama di semua match yang menautkan pemain ini.
    await db.matches.toCollection().modify((m) => {
      for (const s of [...m.teamA, ...m.teamB]) if (s.playerId === id) s.name = trimmed
    })
  })
}

/** Hapus pemain; riwayat tetap menyimpan nama sebagai snapshot. */
export async function deletePlayer(id: number): Promise<void> {
  await db.transaction('rw', db.players, db.matches, async () => {
    await db.players.delete(id)
    await db.matches.toCollection().modify((m) => {
      for (const s of [...m.teamA, ...m.teamB]) if (s.playerId === id) delete s.playerId
    })
  })
}

export async function rematch(match: Match): Promise<number> {
  return createMatch({
    type: match.type,
    quick: match.quick,
    teamA: match.teamA,
    teamB: match.teamB,
    firstServer: null,
    bestOf: match.bestOf ?? 3,
  })
}
