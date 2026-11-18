import type { Match, Slot } from '../db/db'

export const teamName = (team: Slot[]) => team.map((s) => s.name).join(' / ')

export function resultText(m: Match): string {
  const games = m.games.map((g) => `${g.a}-${g.b}`).join(', ')
  const winner = m.winner === 'A' ? m.teamA : m.teamB
  const date = new Date(m.startedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  return [
    `🏸 ${teamName(m.teamA)} vs ${teamName(m.teamB)}`,
    `Skor: ${games}`,
    m.winner ? `Pemenang: ${teamName(winner)}` : 'Belum selesai',
    `${date} · Shuttle Score`,
  ].join('\n')
}

/** Bagikan lewat Web Share API; jika tidak tersedia, salin ke clipboard. */
export async function shareResult(m: Match): Promise<'shared' | 'copied' | 'failed'> {
  const text = resultText(m)
  if (navigator.share) {
    try {
      await navigator.share({ text })
      return 'shared'
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'failed'
    }
  }
  try {
    await navigator.clipboard.writeText(text)
    return 'copied'
  } catch {
    return 'failed'
  }
}

export function formatDuration(ms: number): string {
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min} menit`
  return `${Math.floor(min / 60)} jam ${min % 60} menit`
}
