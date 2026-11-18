import { useLiveQuery } from 'dexie-react-hooks'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../db/db'
import { createMatch, deleteMatch, quickSlots } from '../db/repo'
import type { MatchType } from '../domain/rules'
import { lastBestOf } from '../lib/prefs'
import { teamName } from '../lib/share'

const LAST_QUICK = 'shuttle-score:last-quick'

function readLastQuick(): MatchType {
  try {
    return localStorage.getItem(LAST_QUICK) === 'doubles' ? 'doubles' : 'singles'
  } catch {
    return 'singles'
  }
}

export function Home() {
  const navigate = useNavigate()
  const ongoing = useLiveQuery(() => db.matches.where('status').equals('ongoing').reverse().sortBy('startedAt'), [], [])
  const last = readLastQuick()
  const order: MatchType[] = last === 'doubles' ? ['doubles', 'singles'] : ['singles', 'doubles']

  const quick = async (type: MatchType) => {
    try {
      localStorage.setItem(LAST_QUICK, type)
    } catch {
      // Penyimpanan diblokir; abaikan.
    }
    const id = await createMatch({ type, quick: true, ...quickSlots(type), firstServer: null, bestOf: lastBestOf() })
    navigate(`/match/${id}`)
  }

  const remove = async (id: number, label: string) => {
    if (!confirm(`Hapus match "${label}"? Skor yang sudah dicatat akan hilang dan tidak bisa dikembalikan.`)) return
    await deleteMatch(id)
  }

  return (
    <main className="page home">
      <header className="brand">
        <span className="brand-mark">🏸</span>
        <h1>Shuttle Score</h1>
      </header>

      {ongoing.length > 0 && (
        <section>
          <h2>Lanjutkan</h2>
          <ul className="list">
            {ongoing.map((m) => {
              const cur = m.games[m.games.length - 1]
              return (
                <li key={m.id} className="ongoing-row">
                  <Link className="card" to={`/match/${m.id}`}>
                    <span>
                      {teamName(m.teamA)} <span className="muted">vs</span> {teamName(m.teamB)}
                    </span>
                    <span className="score-pill">{cur ? `${cur.a}–${cur.b}` : 'Mulai'}</span>
                  </Link>
                  <button
                    className="btn danger delete-btn"
                    aria-label={`Hapus match ${teamName(m.teamA)} vs ${teamName(m.teamB)}`}
                    onClick={() => remove(m.id, `${teamName(m.teamA)} vs ${teamName(m.teamB)}`)}
                  >
                    🗑
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <section>
        <h2>Quick match</h2>
        <div className="quick-grid">
          {order.map((t, i) => (
            <button key={t} className={`btn quick ${i === 0 ? 'primary' : ''}`} onClick={() => quick(t)}>
              <span className="quick-icon">{t === 'singles' ? '1 v 1' : '2 v 2'}</span>
              {t === 'singles' ? 'Tunggal' : 'Ganda'}
            </button>
          ))}
        </div>
      </section>

      <nav className="menu">
        <Link className="btn" to="/new">
          Match baru dengan pemain
        </Link>
        <Link className="btn" to="/history">
          Riwayat
        </Link>
        <Link className="btn" to="/players">
          Pemain & statistik
        </Link>
      </nav>
    </main>
  )
}
