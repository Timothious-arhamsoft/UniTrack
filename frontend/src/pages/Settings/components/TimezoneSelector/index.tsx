interface Props {
  value: string
  onChange: (tz: string) => void
}

const COMMON_TIMEZONES = [
  { label: 'UTC+5 — Karachi / Islamabad',  value: 'Asia/Karachi' },
  { label: 'UTC+5:30 — Mumbai / Delhi',    value: 'Asia/Kolkata' },
  { label: 'UTC+6 — Dhaka',                value: 'Asia/Dhaka' },
  { label: 'UTC+8 — Beijing / Singapore',  value: 'Asia/Shanghai' },
  { label: 'UTC+9 — Tokyo / Seoul',        value: 'Asia/Tokyo' },
  { label: 'UTC+3 — Moscow',               value: 'Europe/Moscow' },
  { label: 'UTC+1 — Berlin / Paris',       value: 'Europe/Berlin' },
  { label: 'UTC+0 — London (GMT)',         value: 'Europe/London' },
  { label: 'UTC-5 — New York (EST)',       value: 'America/New_York' },
  { label: 'UTC-6 — Chicago (CST)',        value: 'America/Chicago' },
  { label: 'UTC-7 — Denver (MST)',         value: 'America/Denver' },
  { label: 'UTC-8 — Los Angeles (PST)',    value: 'America/Los_Angeles' },
]

export const TimezoneSelector = ({ value, onChange }: Props) => (
  <div className="form-group">
    <label className="form-label">Timezone</label>
    <select className="form-select" value={value} onChange={(e) => onChange(e.target.value)}>
      {COMMON_TIMEZONES.map((tz) => (
        <option key={tz.value} value={tz.value}>{tz.label}</option>
      ))}
    </select>
    <span className="form-hint">Used for countdown and reminder scheduling.</span>
  </div>
)
