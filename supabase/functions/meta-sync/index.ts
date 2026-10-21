// Daily Meta pull: account-level spend, conversions and value per day into ad_daily.
// Callers: the pg_cron job (x-ingest-secret header) or a signed-in staff member. ?backfill=60 loads history once.
// Needs the Edge Function secret META_ACCESS_TOKEN (a system-user token from FSD's Business Manager with ads_read).
import { createClient } from 'npm:@supabase/supabase-js@2'

const GRAPH = 'https://graph.facebook.com/v23.0'
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const sydneyToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney' }).format(new Date())
const daysBefore = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) - n * 864e5).toISOString().slice(0, 10)

type Action = { action_type: string; value: string }
type Row = { date_start: string; spend?: string; clicks?: string; impressions?: string; actions?: Action[]; action_values?: Action[] }

// What staff see on the client page. The raw Meta error goes to the function logs only.
function friendly(e: { code?: number; message?: string }) {
  if (e.code === 190) return 'Meta access token expired or invalid'
  if (e.code === 100 || e.code === 200 || e.code === 10) return "No access to this ad account. Check the system user's assigned assets"
  if (e.code === 17 || e.code === 4 || e.code === 613) return 'Meta rate limit hit. Will retry on the next run'
  return 'Meta sync failed. See the meta-sync function logs'
}

async function allowed(req: Request) {
  const secret = req.headers.get('x-ingest-secret')
  if (secret) return (await sb.rpc('check_ingest_secret', { candidate: secret })).data === true
  const jwt = req.headers.get('Authorization')?.replace(/^Bearer /, '')
  if (!jwt) return false
  const { data } = await sb.auth.getUser(jwt)
  if (!data.user) return false
  const { data: p } = await sb.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
  return !!p?.role
}

Deno.serve(async (req) => {
  if (!(await allowed(req))) return json({ error: 'Not allowed' }, 401)

  const { data: accounts, error } = await sb.from('accounts').select('id, external_id, conversion_event').eq('platform', 'meta').eq('kind', 'ad_account')
  if (error) { console.error(error); return json({ error: 'Could not read accounts' }, 500) }

  const token = Deno.env.get('META_ACCESS_TOKEN')
  if (!token) {
    await sb.from('accounts').update({ last_sync_error: 'Waiting for the Meta access token' }).eq('platform', 'meta').eq('kind', 'ad_account')
    return json({ ok: false, reason: 'META_ACCESS_TOKEN is not set' })
  }

  const backfill = Math.min(90, Math.max(0, Number(new URL(req.url).searchParams.get('backfill') ?? 0) || 0))
  const today = sydneyToday()
  const report: Record<string, string | number> = {}

  for (const a of accounts ?? []) {
    const params = new URLSearchParams({ level: 'account', time_increment: '1', limit: '500', fields: 'spend,clicks,impressions,actions,action_values', access_token: token })
    if (backfill) params.set('time_range', JSON.stringify({ since: daysBefore(today, backfill), until: daysBefore(today, 1) }))
    else params.set('date_preset', 'yesterday') // yesterday in the ad account's own time zone
    try {
      const res = await fetch(`${GRAPH}/act_${a.external_id}/insights?${params}`)
      const body = await res.json()
      if (body.error) throw body.error
      const pick = (list?: Action[]) => Number(list?.find((x) => x.action_type === a.conversion_event)?.value ?? 0)
      const rows = (body.data as Row[]).map((r) => ({
        account_id: a.id, date: r.date_start, spend: Number(r.spend ?? 0), clicks: Number(r.clicks ?? 0), impressions: Number(r.impressions ?? 0),
        conversions: a.conversion_event ? pick(r.actions) : 0, conv_value: a.conversion_event ? pick(r.action_values) : 0,
      }))
      if (rows.length) {
        const { error: upErr } = await sb.from('ad_daily').upsert(rows)
        if (upErr) throw { message: upErr.message }
      }
      await sb.from('accounts').update({ last_synced_at: new Date().toISOString(), last_sync_error: null }).eq('id', a.id)
      report[a.external_id] = rows.length
    } catch (e) {
      console.error(`act_${a.external_id}`, e)
      const msg = friendly(e as { code?: number })
      await sb.from('accounts').update({ last_sync_error: msg }).eq('id', a.id)
      report[a.external_id] = msg
    }
  }
  return json({ ok: true, report })
})
