// Receives daily Google Ads numbers from scripts/google-ads-sync.js (a Google Ads Script; no developer token needed).
// Body: { rows: [{ customer_id, date, cost, conversions, conversions_value, clicks, impressions }] }, header x-ingest-secret.
import { createClient } from 'npm:@supabase/supabase-js@2'

const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })
const amount = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : 0 }
const count = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0 }

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405)
  const secret = req.headers.get('x-ingest-secret') ?? ''
  if (!secret || (await sb.rpc('check_ingest_secret', { candidate: secret })).data !== true) return json({ error: 'Not allowed' }, 401)

  const body = await req.json().catch(() => null)
  const rows: unknown[] | null = Array.isArray(body?.rows) ? body.rows : null
  if (!rows || rows.length > 20000) return json({ error: 'Expected { rows: [...] } with at most 20,000 rows' }, 400)

  const { data: accounts, error } = await sb.from('accounts').select('id, external_id').eq('platform', 'google').eq('kind', 'ad_account')
  if (error) { console.error(error); return json({ error: 'Could not read accounts' }, 500) }
  const byCid = new Map((accounts ?? []).map((a) => [a.external_id.replace(/\D/g, ''), a.id]))

  const out = []
  const unknown = new Set<string>()
  for (const raw of rows) {
    const r = raw as Record<string, unknown>
    const cid = String(r.customer_id ?? '').replace(/\D/g, '')
    const id = byCid.get(cid)
    if (!id) { if (cid) unknown.add(cid); continue }
    if (typeof r.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) continue
    out.push({ account_id: id, date: r.date, spend: amount(r.cost), conversions: amount(r.conversions), conv_value: amount(r.conversions_value), clicks: count(r.clicks), impressions: count(r.impressions) })
  }

  for (let i = 0; i < out.length; i += 1000) {
    const { error: upErr } = await sb.from('ad_daily').upsert(out.slice(i, i + 1000))
    if (upErr) { console.error(upErr); return json({ error: 'Could not store rows' }, 500) }
  }
  const touched = [...new Set(out.map((r) => r.account_id))]
  if (touched.length) await sb.from('accounts').update({ last_synced_at: new Date().toISOString(), last_sync_error: null }).in('id', touched)

  // Customer IDs the script saw but FSD WorkSpace doesn't know: add them on the client page to start storing them.
  return json({ stored: out.length, unknownCustomerIds: [...unknown] })
})
