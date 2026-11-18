import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../db/db'
import { addPlayer, deletePlayer, renamePlayer } from '../db/repo'
import { computeStats, type Record } from '../domain/stats'

function StatsTable({ title, rows }: { title: string; rows: Record[] }) {
  if (rows.length === 0) return null
  return (
    <section>
      <h2>{title}</h2>
      <table className="stats-table">
        <thead>
          <tr>
            <th>Nama</th>
            <th title="Main">M</th>
            <th title="Menang">W</th>
            <th title="Kalah">L</th>
            <th title="Game menang-kalah">Game</th>
            <th>%</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key}>
              <th>{r.label}</th>
              <td>{r.played}</td>
              <td>{r.won}</td>
              <td>{r.played - r.won}</td>
              <td>
                {r.gamesWon}-{r.gamesLost}
              </td>
              <td>{Math.round((r.won / r.played) * 100)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}

export function Players() {
  const players = useLiveQuery(() => db.players.orderBy('name').toArray(), [], [])
  const matches = useLiveQuery(() => db.matches.where('status').equals('finished').toArray(), [], [])
  const [name, setName] = useState('')
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(null)
  const stats = computeStats(matches, players)

  const add = async (e: React.FormEvent) => {
    e.preventDefault()
    const n = name.trim()
    if (!n || players.some((p) => p.name.toLowerCase() === n.toLowerCase())) return
    await addPlayer(n)
    setName('')
  }

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (editing && editing.name.trim()) await renamePlayer(editing.id, editing.name)
    setEditing(null)
  }

  const remove = async (id: number, n: string) => {
    if (confirm(`Hapus pemain "${n}"? Riwayat match tetap menyimpan namanya, tetapi tidak dihitung di statistik lagi.`)) {
      await deletePlayer(id)
    }
  }

  return (
    <main className="page">
      <header className="topbar">
        <Link to="/" className="back" aria-label="Kembali">
          ←
        </Link>
        <h1>Pemain & statistik</h1>
      </header>

      <form className="row" onSubmit={add}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama pemain baru" />
        <button className="btn primary" type="submit">
          Tambah
        </button>
      </form>

      <ul className="list">
        {players.map((p) =>
          editing?.id === p.id ? (
            <li key={p.id}>
              <form className="row" onSubmit={saveEdit}>
                <input autoFocus value={editing.name} onChange={(e) => setEditing({ id: p.id, name: e.target.value })} />
                <button className="btn primary small" type="submit">
                  Simpan
                </button>
              </form>
            </li>
          ) : (
            <li key={p.id} className="card player-row">
              <span>{p.name}</span>
              <span className="row">
                <button className="btn small" onClick={() => setEditing({ id: p.id, name: p.name })}>
                  Ubah
                </button>
                <button className="btn small danger" onClick={() => remove(p.id, p.name)}>
                  Hapus
                </button>
              </span>
            </li>
          ),
        )}
      </ul>
      {players.length === 0 && <p className="muted">Belum ada pemain. Pemain juga otomatis ditambahkan saat membuat match.</p>}

      <StatsTable title="Statistik pemain" rows={stats.players} />
      <StatsTable title="Statistik pasangan ganda" rows={stats.pairs} />
    </main>
  )
}
