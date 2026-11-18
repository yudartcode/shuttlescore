import Dexie, { type EntityTable } from 'dexie'
import type { GameScore, MatchEvent, MatchType, Side } from '../domain/rules'

export interface Player {
  id: number
  name: string
  createdAt: number
}

/** Snapshot pemain di match. `playerId` kosong untuk quick match yang belum ditautkan. */
export interface Slot {
  playerId?: number
  name: string
}

export interface Match {
  id: number
  type: MatchType
  quick: boolean
  teamA: Slot[]
  teamB: Slot[]
  firstServer: Side | null
  status: 'ongoing' | 'finished'
  winner: Side | null
  games: GameScore[]
  startedAt: number
  endedAt: number | null
}

export interface StoredEvent {
  id: number
  matchId: number
  seq: number
  event: MatchEvent
}

export const db = new Dexie('shuttle-score') as Dexie & {
  players: EntityTable<Player, 'id'>
  matches: EntityTable<Match, 'id'>
  events: EntityTable<StoredEvent, 'id'>
}

db.version(1).stores({
  players: '++id, name',
  matches: '++id, status, startedAt',
  events: '++id, [matchId+seq], matchId',
})
