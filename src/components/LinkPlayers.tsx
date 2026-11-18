import { useState } from 'react'
import type { Match } from '../db/db'
import { updateSlots } from '../db/repo'
import { PlayerDatalist, resolveSlot, TeamInputs } from './TeamInputs'

/** Tautkan slot match (mis. quick match "Tim A") ke pemain agar masuk statistik. */
export function LinkPlayers({ match, onDone }: { match: Match; onDone?: () => void }) {
  const init = (team: Match['teamA']) => team.map((s) => (s.playerId != null ? s.name : ''))
  const [a, setA] = useState(init(match.teamA))
  const [b, setB] = useState(init(match.teamB))
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    const resolve = (vals: string[], team: Match['teamA']) =>
      Promise.all(vals.map((v, i) => (v.trim() ? resolveSlot(v, team[i].name) : Promise.resolve({ name: team[i].name }))))
    const teamA = await resolve(a, match.teamA)
    const teamB = await resolve(b, match.teamB)
    await updateSlots(match.id, teamA, teamB)
    setSaving(false)
    onDone?.()
  }

  return (
    <div className="link-players">
      <PlayerDatalist />
      <p className="hint">Isi nama pemain agar hasil ini masuk statistik. Kosongkan untuk tidak menautkan.</p>
      <TeamInputs label="Tim A" values={a} placeholders={match.teamA.map((s) => s.name)} onChange={setA} />
      <TeamInputs label="Tim B" values={b} placeholders={match.teamB.map((s) => s.name)} onChange={setB} />
      <button className="btn primary" disabled={saving} onClick={save}>
        Simpan pemain
      </button>
    </div>
  )
}
