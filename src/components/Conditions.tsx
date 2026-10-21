import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useLookups } from '../lib/data'
import type { Tables } from '../lib/database.types'
import { addDays, aud, pct, stamp, today } from '../lib/format'
import { Hazard } from './Icons'

type Cond = Tables<'conditions'>
type Acct = Pick<Tables<'accounts'>, 'id' | 'client_id' | 'platform' | 'currency' | 'last_synced_at' | 'last_sync_error'>
type Day = Pick<Tables<'ad_daily'>, 'account_id' | 'date' | 'spend' | 'conversions' | 'conv_value'>

const PLATFORM: Record<string, string> = { meta: 'Meta', google: 'Google' }

// The surf report: every tracked account rated against its own numbers. The rule itself lives in SQL (conditions_on).
export function Conditions({ clientIds }: { clientIds?: Set<string> }) {
  const [conds, setConds] = useState<Cond[] | null>(null)
  const [accts, setAccts] = useState<Acct[]>([])
  const [days, setDays] = useState<Day[]>([])
  const { clientName } = useLookups()

  useEffect(() => {
    Promise.all([
      supabase.from('conditions').select('*'),
      supabase.from('accounts').select('id, client_id, platform, currency, last_synced_at, last_sync_error').eq('kind', 'ad_account').in('platform', ['meta', 'google']),
      supabase.from('ad_daily').select('account_id, date, spend, conversions, conv_value').gte('date', addDays(today(), -31)),
    ]).then(([c, a, d]) => {
      if (c.error || a.error || d.error) console.error(c.error ?? a.error ?? d.error)
      setConds(c.data ?? [])
      setAccts(a.data ?? [])
      setDays(d.data ?? [])
    })
  }, [])

  if (!conds) return <p className="meta py-3">Loading conditions…</p>
  const mine = (id: string) => !clientIds || clientIds.has(id)
  const rows = conds.filter((c) => mine(c.client_id)).sort((a, b) => Number(b.flagged) - Number(a.flagged) || clientName(a.client_id).localeCompare(clientName(b.client_id)))
  const synced = accts.filter((a) => mine(a.client_id) && a.last_synced_at)
  const waiting = accts.filter((a) => mine(a.client_id) && a.last_sync_error)

  if (rows.length === 0)
    return (
      <div className="py-3">
        <p className="meta">No live numbers yet. Conditions fill in once the nightly Meta and Google sync is connected.</p>
        {waiting.length > 0 && <p className="meta mt-2">Last sync note: {waiting[0].last_sync_error}</p>}
      </div>
    )

  const last = synced.map((a) => a.last_synced_at!).sort().at(-1)
  return (
    <div>
      {rows.map((c) => {
        const acct = accts.find((a) => a.id === c.account_id)
        const roas = (c.alert ?? 'roas') === 'roas'
        const fmt = (n: number | null) => (n == null ? 'n/a' : roas ? `${n.toFixed(1)}x` : aud(n, acct?.currency))
        const better = c.change == null ? null : roas ? c.change >= 0 : c.change <= 0
        const belowFloor = c.roas_floor != null && c.base_metric != null && c.base_metric < c.roas_floor
        const rating = c.flagged || belowFloor ? 'Poor' : better == null ? 'No data' : better ? 'Good' : 'Fair'
        const tone = rating === 'Poor' ? 'text-red' : rating === 'Fair' ? 'text-fair' : rating === 'Good' ? 'text-good' : 'text-mid'
        const series = Array.from({ length: 30 }, (_, i) => {
          const d = days.find((x) => x.account_id === c.account_id && x.date === addDays(today(), i - 30))
          if (!d) return null
          return roas ? (d.spend ? d.conv_value / d.spend : null) : d.conversions ? d.spend / d.conversions : null
        })
        const top = Math.max(...series.map((v) => v ?? 0), 0.0001)
        return (
          <article key={c.account_id} className="border-b border-rule py-3">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate font-semibold">{clientName(c.client_id)}</span>
              <span className="meta shrink-0">{PLATFORM[c.platform] ?? c.platform} · {roas ? 'ROAS' : 'CPA'}</span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              {rating === 'Poor' && <Hazard size={16} aria-label="Alert" />}
              <span className={`display text-m tracking-[0.06em] ${tone}`}>{rating}</span>
              <span className="num font-semibold">{fmt(c.y_metric)}</span>
              {c.change != null && <span className={`num ${tone}`}>{pct(c.change)}</span>}
            </div>
            <p className="meta num">
              60-day {fmt(c.base_metric)}{c.roas_floor != null && ` · floor ${c.roas_floor}x`} · {Number(c.y_conv ?? 0)} conversions yesterday
            </p>
            <div className="mt-2 flex h-6 items-end gap-px" role="img" aria-label={`Last 30 days of ${roas ? 'ROAS' : 'CPA'}, yesterday ${fmt(c.y_metric)}`}>
              {series.map((v, i) => (
                <span key={i} className={`w-full ${i === 29 ? (rating === 'Poor' ? 'bg-red' : 'bg-good') : 'bg-bar'}`} style={{ height: `${v == null ? 2 : Math.max(8, (v / top) * 100)}%` }} />
              ))}
            </div>
          </article>
        )
      })}
      {last && <p className="meta mt-2">Synced {stamp(last)}</p>}
    </div>
  )
}
