import type { BestOf } from '../domain/rules'

export function BestOfPicker({ value, onChange }: { value: BestOf; onChange: (v: BestOf) => void }) {
  return (
    <fieldset className="team-inputs">
      <legend>Format</legend>
      <div className="segmented" role="radiogroup" aria-label="Format match">
        {([1, 3] as const).map((n) => (
          <button key={n} role="radio" aria-checked={value === n} className={value === n ? 'on' : ''} onClick={() => onChange(n)}>
            {n === 1 ? 'Best of 1' : 'Best of 3'}
          </button>
        ))}
      </div>
    </fieldset>
  )
}
