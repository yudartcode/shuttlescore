import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { BestOfPicker } from '../components/BestOfPicker'
import { PlayerDatalist, resolveSlot, TeamInputs } from '../components/TeamInputs'
import { createMatch, quickSlots } from '../db/repo'
import type { BestOf, MatchType, Side } from '../domain/rules'
import { lastBestOf, rememberBestOf } from '../lib/prefs'

export function NewMatch() {
  const navigate = useNavigate()
  const [type, setType] = useState<MatchType>('singles')
  const [a, setA] = useState(['', ''])
  const [b, setB] = useState(['', ''])
  const [bestOf, setBestOf] = useState<BestOf>(lastBestOf)
  const [server, setServer] = useState<Side | 'random'>('A')
  const [busy, setBusy] = useState(false)

  const n = type === 'singles' ? 1 : 2
  const defaults = quickSlots(type)

  const start = async () => {
    setBusy(true)
    const teamA = await Promise.all(a.slice(0, n).map((v, i) => resolveSlot(v, defaults.teamA[i].name)))
    const teamB = await Promise.all(b.slice(0, n).map((v, i) => resolveSlot(v, defaults.teamB[i].name)))
    const firstServer: Side = server === 'random' ? (Math.random() < 0.5 ? 'A' : 'B') : server
    rememberBestOf(bestOf)
    const id = await createMatch({ type, quick: false, teamA, teamB, firstServer, bestOf })
    navigate(`/match/${id}`, { replace: true })
  }

  return (
    <main className="page">
      <header className="topbar">
        <Link to="/" className="back" aria-label="Kembali">
          ←
        </Link>
        <h1>Match baru</h1>
      </header>
      <PlayerDatalist />

      <div className="segmented" role="radiogroup" aria-label="Jenis match">
        {(['singles', 'doubles'] as const).map((t) => (
          <button key={t} role="radio" aria-checked={type === t} className={type === t ? 'on' : ''} onClick={() => setType(t)}>
            {t === 'singles' ? 'Tunggal' : 'Ganda'}
          </button>
        ))}
      </div>

      <TeamInputs label="Tim A" values={a.slice(0, n)} placeholders={defaults.teamA.map((s) => s.name)} onChange={(v) => setA([...v, ...a.slice(n)])} />
      <TeamInputs label="Tim B" values={b.slice(0, n)} placeholders={defaults.teamB.map((s) => s.name)} onChange={(v) => setB([...v, ...b.slice(n)])} />
      {type === 'doubles' && <p className="hint">Pemain pertama tiap tim mulai di kotak kanan. Posisi bisa ditukar di awal tiap game.</p>}

      <BestOfPicker value={bestOf} onChange={setBestOf} />

      <fieldset className="team-inputs">
        <legend>Servis pertama</legend>
        <div className="segmented">
          {(['A', 'B', 'random'] as const).map((s) => (
            <button key={s} aria-checked={server === s} role="radio" className={server === s ? 'on' : ''} onClick={() => setServer(s)}>
              {s === 'random' ? 'Undi' : `Tim ${s}`}
            </button>
          ))}
        </div>
      </fieldset>

      <button className="btn primary big" disabled={busy} onClick={start}>
        Mulai
      </button>
    </main>
  )
}
