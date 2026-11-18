import { useState } from 'react'
import type { Match } from '../db/db'
import { formatDuration, shareResult, teamName } from '../lib/share'
import { LinkPlayers } from './LinkPlayers'

export function GamesTable({ match }: { match: Match }) {
  return (
    <table className="games-table">
      <thead>
        <tr>
          <th></th>
          {match.games.map((_, i) => (
            <th key={i}>G{i + 1}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(['A', 'B'] as const).map((side) => (
          <tr key={side} className={match.winner === side ? 'winner' : ''}>
            <th>{teamName(side === 'A' ? match.teamA : match.teamB)}</th>
            {match.games.map((g, i) => {
              const mine = side === 'A' ? g.a : g.b
              const theirs = side === 'A' ? g.b : g.a
              return (
                <td key={i} className={mine > theirs ? 'won' : ''}>
                  {mine}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

export function MatchSummary({ match }: { match: Match }) {
  const [msg, setMsg] = useState('')
  const [linking, setLinking] = useState(false)
  const unlinked = [...match.teamA, ...match.teamB].some((s) => s.playerId == null)
  const winner = match.winner === 'A' ? match.teamA : match.teamB

  const share = async () => {
    const r = await shareResult(match)
    setMsg(r === 'copied' ? 'Hasil disalin ke clipboard' : r === 'failed' ? '' : 'Dibagikan')
  }

  return (
    <div className="summary">
      {match.winner && (
        <p className="summary-winner">
          🏆 <strong>{teamName(winner)}</strong> menang
        </p>
      )}
      <GamesTable match={match} />
      {match.endedAt && <p className="muted">Durasi {formatDuration(match.endedAt - match.startedAt)}</p>}
      <div className="row">
        <button className="btn primary" onClick={share}>
          Bagikan hasil
        </button>
        {unlinked && !linking && (
          <button className="btn" onClick={() => setLinking(true)}>
            Tautkan pemain
          </button>
        )}
      </div>
      {msg && <p className="muted">{msg}</p>}
      {linking && <LinkPlayers match={match} onDone={() => setLinking(false)} />}
    </div>
  )
}
