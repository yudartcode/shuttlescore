import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { LinkPlayers } from '../components/LinkPlayers'
import { GamesTable } from '../components/MatchSummary'
import { db } from '../db/db'
import { deleteMatch } from '../db/repo'
import { formatDuration, shareResult, teamName } from '../lib/share'

const fmtDate = (t: number) =>
  new Date(t).toLocaleString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

export function History() {
  const matches = useLiveQuery(() => db.matches.where('status').equals('finished').reverse().sortBy('startedAt'), [], [])
  return (
    <main className="page">
      <header className="topbar">
        <Link to="/" className="back" aria-label="Kembali">
          ←
        </Link>
        <h1>Riwayat</h1>
      </header>
      {matches.length === 0 && <p className="muted">Belum ada pertandingan selesai.</p>}
      <ul className="list">
        {matches.map((m) => (
          <li key={m.id}>
            <Link className="card history-card" to={`/history/${m.id}`}>
              <span className="history-teams">
                <span className={m.winner === 'A' ? 'win' : ''}>{teamName(m.teamA)}</span>
                <span className={m.winner === 'B' ? 'win' : ''}>{teamName(m.teamB)}</span>
              </span>
              <span className="history-games">
                {m.games.map((g, i) => (
                  <span key={i}>
                    {g.a}–{g.b}
                  </span>
                ))}
              </span>
              <span className="muted history-date">
                {fmtDate(m.startedAt)}
                {m.quick && ' · quick'}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}

export function MatchDetail() {
  const id = Number(useParams().id)
  const navigate = useNavigate()
  const match = useLiveQuery(() => db.matches.get(id), [id], null)
  const [linking, setLinking] = useState(false)
  const [msg, setMsg] = useState('')

  if (match === null) return <main className="page" />
  if (!match) {
    return (
      <main className="page">
        <p>Match tidak ditemukan.</p>
        <Link className="btn" to="/history">
          Ke riwayat
        </Link>
      </main>
    )
  }

  const remove = async () => {
    if (!confirm('Hapus pertandingan ini? Tindakan ini tidak bisa dibatalkan.')) return
    await deleteMatch(match.id)
    navigate('/history', { replace: true })
  }

  const share = async () => {
    const r = await shareResult(match)
    setMsg(r === 'copied' ? 'Hasil disalin ke clipboard' : '')
  }

  return (
    <main className="page">
      <header className="topbar">
        <Link to="/history" className="back" aria-label="Kembali">
          ←
        </Link>
        <h1>Detail match</h1>
      </header>
      <p className="muted">
        {fmtDate(match.startedAt)} · {match.type === 'singles' ? 'Tunggal' : 'Ganda'}
        {match.endedAt && ` · ${formatDuration(match.endedAt - match.startedAt)}`}
      </p>
      <GamesTable match={match} />
      <div className="row">
        <button className="btn primary" onClick={share}>
          Bagikan
        </button>
        <button className="btn" onClick={() => setLinking((v) => !v)}>
          Ubah pemain
        </button>
        <Link className="btn" to={`/match/${match.id}`}>
          Buka papan skor
        </Link>
      </div>
      {msg && <p className="muted">{msg}</p>}
      {linking && <LinkPlayers match={match} onDone={() => setLinking(false)} />}
      <button className="btn danger" onClick={remove}>
        Hapus match
      </button>
    </main>
  )
}
