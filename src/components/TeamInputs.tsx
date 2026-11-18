import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Slot } from '../db/db'
import { addPlayer } from '../db/repo'

/** Ubah nama ketikan menjadi slot: pakai pemain yang ada (tanpa beda huruf besar), buat baru, atau nama default. */
export async function resolveSlot(name: string, fallback: string): Promise<Slot> {
  const trimmed = name.trim()
  if (!trimmed) return { name: fallback }
  const all = await db.players.toArray()
  const found = all.find((p) => p.name.toLowerCase() === trimmed.toLowerCase())
  if (found) return { playerId: found.id, name: found.name }
  return { playerId: await addPlayer(trimmed), name: trimmed }
}

export function PlayerDatalist() {
  const players = useLiveQuery(() => db.players.orderBy('name').toArray(), [], [])
  return (
    <datalist id="players-list">
      {players.map((p) => (
        <option key={p.id} value={p.name} />
      ))}
    </datalist>
  )
}

interface Props {
  label: string
  values: string[]
  placeholders: string[]
  onChange: (values: string[]) => void
}

export function TeamInputs({ label, values, placeholders, onChange }: Props) {
  return (
    <fieldset className="team-inputs">
      <legend>{label}</legend>
      {values.map((v, i) => (
        <input
          key={i}
          value={v}
          list="players-list"
          placeholder={placeholders[i]}
          autoComplete="off"
          onChange={(e) => onChange(values.map((x, j) => (j === i ? e.target.value : x)))}
        />
      ))}
    </fieldset>
  )
}
