import type { Match, Player } from '../db/db'

export interface Record {
  key: string
  label: string
  played: number
  won: number
  gamesWon: number
  gamesLost: number
}

const empty = (key: string, label: string): Record => ({ key, label, played: 0, won: 0, gamesWon: 0, gamesLost: 0 })

/**
 * Statistik per pemain dan per pasangan ganda.
 * Hanya match selesai dan slot yang tertaut ke pemain yang dihitung.
 */
export function computeStats(matches: Match[], players: Player[]) {
  const names = new Map(players.map((p) => [p.id, p.name]))
  const perPlayer = new Map<number, Record>()
  const perPair = new Map<string, Record>()

  for (const m of matches) {
    if (m.status !== 'finished' || !m.winner) continue
    for (const side of ['A', 'B'] as const) {
      const team = side === 'A' ? m.teamA : m.teamB
      const won = m.winner === side
      const gw = m.games.filter((g) => (side === 'A' ? g.a > g.b : g.b > g.a)).length
      const gl = m.games.length - gw
      const add = (r: Record) => {
        r.played += 1
        r.won += won ? 1 : 0
        r.gamesWon += gw
        r.gamesLost += gl
      }

      for (const slot of team) {
        if (slot.playerId == null || !names.has(slot.playerId)) continue
        const id = slot.playerId
        if (!perPlayer.has(id)) perPlayer.set(id, empty(String(id), names.get(id)!))
        add(perPlayer.get(id)!)
      }

      if (m.type === 'doubles') {
        const ids = team.map((s) => s.playerId).filter((id): id is number => id != null && names.has(id))
        if (ids.length === 2) {
          ids.sort((x, y) => x - y)
          const k = ids.join('-')
          if (!perPair.has(k)) perPair.set(k, empty(k, ids.map((id) => names.get(id)).join(' / ')))
          add(perPair.get(k)!)
        }
      }
    }
  }

  const sort = (rs: Record[]) => rs.sort((x, y) => y.won - x.won || x.played - y.played || x.label.localeCompare(y.label))
  return { players: sort([...perPlayer.values()]), pairs: sort([...perPair.values()]) }
}
