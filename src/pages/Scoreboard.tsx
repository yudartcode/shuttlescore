import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MatchSummary } from '../components/MatchSummary'
import { db, type Match } from '../db/db'
import { configOf, loadEvents, pushEvent, rematch, setFirstServer, undoEvent } from '../db/repo'
import {
  type MatchState,
  type Side,
  canSwap,
  isGamePoint,
  isMatchPoint,
  replay,
  serverPosition,
} from '../domain/rules'
import { useWakeLock } from '../hooks/useWakeLock'
import { teamName } from '../lib/share'

export function Scoreboard() {
  const id = Number(useParams().id)
  const match = useLiveQuery(() => db.matches.get(id), [id], null)
  const events = useLiveQuery(() => loadEvents(id), [id])

  if (match === null || events === undefined) return <main className="page" />
  if (!match) {
    return (
      <main className="page">
        <p>Match tidak ditemukan.</p>
        <Link className="btn" to="/">
          Ke beranda
        </Link>
      </main>
    )
  }

  const config = configOf(match)
  if (!config) return <ChooseServer match={match} />
  return <Board match={match} state={replay(config, events)} eventCount={events.length} />
}

function ChooseServer({ match }: { match: Match }) {
  const pick = (s: Side) => setFirstServer(match.id, s)
  return (
    <main className="page choose-server">
      <header className="topbar">
        <Link to="/" className="back" aria-label="Kembali">
          ←
        </Link>
        <h1>Siapa servis pertama?</h1>
      </header>
      <div className="choose-grid">
        {(['A', 'B'] as const).map((s) => (
          <button key={s} className={`btn team-${s.toLowerCase()} huge`} onClick={() => pick(s)}>
            {teamName(s === 'A' ? match.teamA : match.teamB)}
          </button>
        ))}
      </div>
      <button className="btn" onClick={() => pick(Math.random() < 0.5 ? 'A' : 'B')}>
        Undi
      </button>
    </main>
  )
}

function Board({ match, state, eventCount }: { match: Match; state: MatchState; eventCount: number }) {
  const navigate = useNavigate()
  const busy = useRef(false)
  const [toast, setToast] = useState('')
  useWakeLock(!state.finished)

  // Tampilkan pengingat saat event terakhir menutup game atau memicu ganti sisi.
  const lastCount = useRef(eventCount)
  useEffect(() => {
    const added = eventCount > lastCount.current
    lastCount.current = eventCount
    if (!added || state.finished) return
    if (state.gameJustEnded) {
      const g = state.games[state.games.length - 1]
      setToast(`Game ${state.games.length} selesai ${g.a}–${g.b}. Ganti sisi lapangan!`)
    } else if (state.sideSwitched) {
      setToast('Poin 11 — ganti sisi lapangan!')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventCount])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(''), 4000)
    return () => clearTimeout(t)
  }, [toast])

  const run = async (fn: () => Promise<void>) => {
    if (busy.current) return
    busy.current = true
    try {
      await fn()
    } finally {
      busy.current = false
    }
  }

  const point = (side: Side) => run(() => pushEvent(match.id, { kind: 'rally', winner: side }))
  const undo = () => run(() => undoEvent(match.id))
  const swap = (side: Side) => run(() => pushEvent(match.id, { kind: 'swap', team: side }))
  const again = async () => navigate(`/match/${await rematch(match)}`, { replace: true })

  const sides: Side[] = state.ends ? ['B', 'A'] : ['A', 'B']
  const pos = serverPosition(state)

  return (
    <main className="board">
      <header className="board-bar">
        <Link to="/" className="back" aria-label="Ke beranda">
          ←
        </Link>
        <span className="board-title">
          {state.finished ? 'Selesai' : `Game ${state.gameIndex + 1}`}
          <span className="muted"> · {match.type === 'singles' ? 'Tunggal' : 'Ganda'}</span>
        </span>
        <button className="btn small" onClick={undo} aria-label="Batalkan poin terakhir">
          ↶ Undo
        </button>
      </header>

      {state.finished ? (
        <section className="board-summary">
          <MatchSummary match={match} />
          <div className="row">
            <button className="btn primary" onClick={again}>
              Main lagi
            </button>
            <Link className="btn" to="/">
              Beranda
            </Link>
          </div>
        </section>
      ) : (
        <div className="halves">
          {sides.map((side) => {
            const team = side === 'A' ? match.teamA : match.teamB
            const score = side === 'A' ? state.current.a : state.current.b
            const serving = state.server === side
            const badge = isMatchPoint(state, side) ? 'MATCH POINT' : isGamePoint(state.current, side) ? 'GAME POINT' : ''
            return (
              <section key={side} className={`half team-${side.toLowerCase()} ${serving ? 'serving' : ''}`}>
                <button className="tap" onClick={() => point(side)} aria-label={`Poin untuk ${teamName(team)}`}>
                  <span className="games-won" aria-label={`${state.gamesWon[side]} game`}>
                    {Array.from({ length: 2 }, (_, i) => (
                      <i key={i} className={i < state.gamesWon[side] ? 'on' : ''} />
                    ))}
                  </span>
                  <span className="players">
                    {team.map((p, i) => {
                      const isServer = serving && pos.server === i
                      const isReceiver = !serving && pos.receiver === i
                      const court = match.type === 'doubles' ? (state.pos[side][0] === i ? 'kanan' : 'kiri') : ''
                      return (
                        <span key={i} className={`player ${isServer ? 'server' : ''} ${isReceiver ? 'receiver' : ''}`}>
                          {isServer && <span aria-label="servis">🏸 </span>}
                          {p.name}
                          {court && <small> · {court}</small>}
                        </span>
                      )
                    })}
                  </span>
                  <span className="score">{score}</span>
                  <span className="badge">{badge}</span>
                  {serving && <span className="serve-note">Servis dari kotak {pos.court === 'right' ? 'kanan' : 'kiri'}</span>}
                </button>
                {canSwap(state, match.type) && (
                  <button className="btn small swap" onClick={() => swap(side)}>
                    ⇄ Tukar posisi
                  </button>
                )}
              </section>
            )
          })}
        </div>
      )}

      {toast && (
        <div className="toast" role="status" onClick={() => setToast('')}>
          {toast}
        </div>
      )}
    </main>
  )
}
