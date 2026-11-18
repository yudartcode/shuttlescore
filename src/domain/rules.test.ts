import { describe, expect, it } from 'vitest'
import {
  type MatchConfig,
  type MatchEvent,
  type Side,
  canSwap,
  isGameOver,
  isMatchPoint,
  replay,
  serverPosition,
} from './rules'

const r = (winner: Side): MatchEvent => ({ kind: 'rally', winner })
const many = (winner: Side, n: number): MatchEvent[] => Array.from({ length: n }, () => r(winner))
/** Rally bergantian sampai skor x-x. */
const tie = (n: number): MatchEvent[] => Array.from({ length: n }, () => [r('A'), r('B')]).flat()

const singles: MatchConfig = { type: 'singles', firstServer: 'A' }
const doubles: MatchConfig = { type: 'doubles', firstServer: 'A' }

describe('isGameOver', () => {
  it.each([
    [{ a: 21, b: 19 }, true],
    [{ a: 21, b: 20 }, false],
    [{ a: 22, b: 20 }, true],
    [{ a: 29, b: 29 }, false],
    [{ a: 30, b: 29 }, true],
    [{ a: 20, b: 0 }, false],
  ])('%o -> %s', (score, expected) => {
    expect(isGameOver(score)).toBe(expected)
  })
})

describe('skor game', () => {
  it('21-0 menutup game 1 dan memulai game 2', () => {
    const s = replay(singles, many('A', 21))
    expect(s.games).toEqual([{ a: 21, b: 0 }])
    expect(s.gameIndex).toBe(1)
    expect(s.current).toEqual({ a: 0, b: 0 })
    expect(s.gamesWon).toEqual({ A: 1, B: 0 })
  })

  it('deuce 29-29: poin ke-30 menang', () => {
    const s = replay(singles, [...tie(29), r('B')])
    expect(s.games).toEqual([{ a: 29, b: 30 }])
    expect(s.gamesWon.B).toBe(1)
  })

  it('pemenang game servis pertama di game berikutnya', () => {
    const s = replay(singles, [...many('B', 21)])
    expect(s.server).toBe('B')
  })

  it('match selesai 2-0 dan event berikutnya diabaikan', () => {
    const s = replay(singles, [...many('A', 42), r('B')])
    expect(s.finished).toBe(true)
    expect(s.winner).toBe('A')
    expect(s.games).toEqual([
      { a: 21, b: 0 },
      { a: 21, b: 0 },
    ])
    expect(s.rallyCount).toBe(42)
  })

  it('match point terdeteksi', () => {
    const s = replay(singles, [...many('A', 21), ...many('A', 20)])
    expect(isMatchPoint(s, 'A')).toBe(true)
    expect(isMatchPoint(s, 'B')).toBe(false)
  })
})

describe('ganti sisi', () => {
  it('setelah tiap game', () => {
    const s1 = replay(singles, many('A', 21))
    expect(s1.sideSwitched).toBe(true)
    expect(s1.ends).toBe(true)
    const s2 = replay(singles, [...many('A', 21), ...many('B', 21)])
    expect(s2.ends).toBe(false)
  })

  it('di game ke-3 saat salah satu tim mencapai 11', () => {
    const base = [...many('A', 21), ...many('B', 21)]
    const before = replay(singles, [...base, ...tie(10)])
    expect(before.ends).toBe(false)
    const at11 = replay(singles, [...base, ...tie(10), r('B')])
    expect(at11.sideSwitched).toBe(true)
    expect(at11.ends).toBe(true)
    // Tim lain mencapai 11 tidak memicu ganti sisi lagi.
    const after = replay(singles, [...base, ...tie(10), r('B'), r('A')])
    expect(after.sideSwitched).toBe(false)
    expect(after.ends).toBe(true)
  })

  it('tidak ganti sisi di poin 11 game 1', () => {
    const s = replay(singles, many('A', 11))
    expect(s.sideSwitched).toBe(false)
    expect(s.ends).toBe(false)
  })
})

describe('posisi servis tunggal', () => {
  it('skor genap kanan, ganjil kiri', () => {
    expect(serverPosition(replay(singles, [])).court).toBe('right')
    expect(serverPosition(replay(singles, [r('A')])).court).toBe('left')
    const s = replay(singles, [r('A'), r('B')]) // B servis dengan skor 1
    expect(s.server).toBe('B')
    expect(serverPosition(s).court).toBe('left')
  })
})

describe('rotasi servis ganda', () => {
  it('awal: A0 servis dari kanan ke B0', () => {
    const p = serverPosition(replay(doubles, []))
    expect(p).toEqual({ server: 0, receiver: 0, court: 'right' })
  })

  it('tim servis menang: server yang sama pindah ke kiri', () => {
    const s = replay(doubles, [r('A')])
    expect(s.pos.A).toEqual([1, 0])
    expect(s.pos.B).toEqual([0, 1])
    expect(serverPosition(s)).toEqual({ server: 0, receiver: 1, court: 'left' })
  })

  it('penerima menang: posisi tetap, servis pindah', () => {
    const s = replay(doubles, [r('A'), r('B')]) // 1-1, B servis dari kiri
    expect(s.pos.A).toEqual([1, 0])
    expect(s.pos.B).toEqual([0, 1])
    expect(s.server).toBe('B')
    expect(serverPosition(s)).toEqual({ server: 1, receiver: 0, court: 'left' })
  })

  it('servis kembali ke A: pemain sesuai paritas skor A', () => {
    // A 1-0 (A0 di kiri), B 1-1, B 1-2 (B1 pindah kanan), A 2-2 -> A servis dari kanan = A1
    const s = replay(doubles, [r('A'), r('B'), r('B'), r('A')])
    expect(s.current).toEqual({ a: 2, b: 2 })
    expect(s.pos.A).toEqual([1, 0])
    expect(s.pos.B).toEqual([1, 0])
    expect(serverPosition(s)).toEqual({ server: 1, receiver: 1, court: 'right' })
  })

  it('swap hanya di 0-0 dan hanya ganda', () => {
    const s = replay(doubles, [{ kind: 'swap', team: 'B' }])
    expect(s.pos.B).toEqual([1, 0])
    expect(canSwap(replay(doubles, [r('A')]), 'doubles')).toBe(false)
    expect(canSwap(replay(singles, []), 'singles')).toBe(false)
    const ignored = replay(doubles, [r('A'), { kind: 'swap', team: 'B' }])
    expect(ignored.pos.B).toEqual([0, 1])
  })

  it('posisi reset di awal game baru', () => {
    const s = replay(doubles, many('A', 21))
    expect(s.pos.A).toEqual([0, 1])
    expect(s.pos.B).toEqual([0, 1])
  })
})

describe('undo (replay tanpa event terakhir)', () => {
  it('kembali melewati batas game', () => {
    const events = [...tie(19), r('A'), r('A')] // 21-19
    const done = replay(singles, events)
    expect(done.gameIndex).toBe(1)
    const undone = replay(singles, events.slice(0, -1))
    expect(undone.gameIndex).toBe(0)
    expect(undone.current).toEqual({ a: 20, b: 19 })
  })

  it('membuka kembali match yang sudah selesai', () => {
    const events = many('A', 42)
    expect(replay(singles, events).finished).toBe(true)
    const undone = replay(singles, events.slice(0, -1))
    expect(undone.finished).toBe(false)
    expect(undone.current).toEqual({ a: 20, b: 0 })
  })
})
