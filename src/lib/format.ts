// Dates are calendar dates (YYYY-MM-DD) compared as strings; "today" is the viewer's own day.
export const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
export const today = () => iso(new Date())
export const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T12:00:00`)
  d.setDate(d.getDate() + n)
  return iso(d)
}
export const monthStart = (day: string) => `${day.slice(0, 7)}-01`

const dayFmt = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short' })
const longFmt = new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })
const monthFmt = new Intl.DateTimeFormat('en-AU', { month: 'long', year: 'numeric' })
const stampFmt = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })

export const shortDate = (day: string) => dayFmt.format(new Date(`${day}T12:00:00`))
export const longDate = (day: string) => longFmt.format(new Date(`${day}T12:00:00`))
export const monthName = (day: string) => monthFmt.format(new Date(`${day.slice(0, 7)}-15T12:00:00`))
export const stamp = (ts: string) => stampFmt.format(new Date(ts))

export const clock = (timeZone: string) =>
  new Intl.DateTimeFormat('en-AU', { timeZone, hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())

const money = new Intl.NumberFormat('en-AU', { maximumFractionDigits: 0 })
export const aud = (n: number | null | undefined, currency = 'AUD') =>
  n == null ? '' : `${currency === 'AUD' ? 'A$' : currency === 'USD' ? 'US$' : `${currency} `}${money.format(n)}`
export const hours = (n: number) => `${Number(n.toFixed(2))}h`
export const pct = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(Math.round(n * 100))}%`

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?'

// RFC 4180: quote every field, double any quotes inside. Notes can hold commas and line breaks.
export const toCsv = (rows: (string | number | null | undefined)[][]) =>
  rows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\r\n')
