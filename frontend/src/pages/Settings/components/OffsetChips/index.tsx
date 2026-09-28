interface Props {
  value: number[]
  onChange: (offsets: number[]) => void
}

const PRESET_OFFSETS = [30, 14, 7, 3, 1, 0]

export const OffsetChips = ({ value, onChange }: Props) => {
  const toggle = (days: number) => {
    if (value.includes(days)) {
      onChange(value.filter((d) => d !== days))
    } else {
      onChange([...value, days].sort((a, b) => b - a))
    }
  }

  return (
    <div className="form-group">
      <label className="form-label">Default Reminder Offsets</label>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
        {PRESET_OFFSETS.map((days) => (
          <button
            key={days}
            type="button"
            className={`chip ${value.includes(days) ? 'active' : ''}`}
            onClick={() => toggle(days)}
          >
            {days === 0 ? 'Same day' : `${days}d`}
          </button>
        ))}
      </div>
      <span className="form-hint">
        Selected: {value.length === 0 ? 'none' : value.map((d) => d === 0 ? 'same day' : `${d}d`).join(', ')} before deadline
      </span>
    </div>
  )
}
