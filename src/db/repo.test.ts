import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { computeStats } from '../domain/stats'
import { db } from './db'
import { createMatch, deletePlayer, pushEvent, quickSlots, setFirstServer, undoEvent, updateSlots, addPlayer } from './repo'

async function playPoints(id: number, winner: 'A' | 'B', n: number) {
  for (let i = 0; i < n; i++) await pushEvent(id, { kind: 'rally', winner })
}

beforeEach(async () => {
  await Promise.all([db.players.clear(), db.matches.clear(), db.events.clear()])
})

describe('repo', () => {
  it('quick match: pilih servis, main sampai selesai, undo membuka lagi', async () => {
    const id = await createMatch({ type: 'singles', quick: true, ...quickSlots('singles'), firstServer: null })
    await setFirstServer(id, 'A')
    await playPoints(id, 'A', 42)
    let m = (await db.matches.get(id))!
    expect(m.status).toBe('finished')
    expect(m.winner).toBe('A')
    expect(m.games).toEqual([
      { a: 21, b: 0 },
      { a: 21, b: 0 },
    ])
    expect(m.endedAt).not.toBeNull()

    await undoEvent(id)
    m = (await db.matches.get(id))!
    expect(m.status).toBe('ongoing')
    expect(m.endedAt).toBeNull()
    expect(m.games.at(-1)).toEqual({ a: 20, b: 0 })
  })

  it('undo tanpa rally membatalkan pilihan servis', async () => {
    const id = await createMatch({ type: 'doubles', quick: true, ...quickSlots('doubles'), firstServer: null })
    await setFirstServer(id, 'B')
    await undoEvent(id)
    expect((await db.matches.get(id))!.firstServer).toBeNull()
  })

  it('statistik hanya menghitung slot tertaut; hapus pemain menjaga nama', async () => {
    const id = await createMatch({ type: 'doubles', quick: true, ...quickSlots('doubles'), firstServer: 'A' })
    await playPoints(id, 'A', 42)
    let stats = computeStats(await db.matches.toArray(), await db.players.toArray())
    expect(stats.players).toHaveLength(0)

    const budi = await addPlayer('Budi')
    const andi = await addPlayer('Andi')
    await updateSlots(id, [{ playerId: budi, name: 'Budi' }, { playerId: andi, name: 'Andi' }], quickSlots('doubles').teamB)
    stats = computeStats(await db.matches.toArray(), await db.players.toArray())
    expect(stats.players.map((r) => [r.label, r.won])).toEqual([
      ['Andi', 1],
      ['Budi', 1],
    ])
    expect(stats.pairs[0]).toMatchObject({ label: 'Budi / Andi', played: 1, won: 1, gamesWon: 2, gamesLost: 0 })

    await deletePlayer(budi)
    const m = (await db.matches.get(id))!
    expect(m.teamA[0]).toEqual({ name: 'Budi' })
    stats = computeStats(await db.matches.toArray(), await db.players.toArray())
    expect(stats.players.map((r) => r.label)).toEqual(['Andi'])
    expect(stats.pairs).toHaveLength(0)
  })
})
