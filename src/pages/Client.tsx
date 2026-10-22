import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { run, useData, useLookups, useScope, useTaskLink, type Client } from '../lib/data'
import type { Tables } from '../lib/database.types'
import { hours, longDate, monthStart, today } from '../lib/format'
import { TYPES } from '../lib/model'
import { copyText, Empty, Section, TaskRow } from '../components/bits'
import { Conditions } from '../components/Conditions'
import { Copy, External, Plus, Trash } from '../components/Icons'

type Account = Tables<'accounts'>
type Contact = Tables<'contacts'>
type Recurring = Tables<'recurring'>

const PLATFORMS = ['meta', 'google', 'bing', 'openai', 'tiktok', 'ga4', 'gbp', 'se_rankings', 'shopify', 'other']
const PLATFORM_LABEL: Record<string, string> = { meta: 'Meta', google: 'Google Ads', bing: 'Microsoft Ads', openai: 'OpenAI Ads', tiktok: 'TikTok', ga4: 'GA4', gbp: 'Business Profile', se_rankings: 'SE Ranking', shopify: 'Shopify', other: 'Other' }
const KINDS = ['ad_account', 'pixel', 'page', 'catalog', 'property', 'other']
const KIND_LABEL: Record<string, string> = { ad_account: 'Ad account', pixel: 'Pixel', page: 'Page', catalog: 'Catalog', property: 'Property', other: 'Other' }

export function ClientPage() {
  const { client } = useScope()
  const { clients, tasks } = useData()
  const { open } = useTaskLink()
  if (!client) return clients.length ? <Navigate to="/clients" replace /> : null

  const brands = clients.filter((c) => c.parent_id === client.id)
  const group = clients.find((c) => c.id === client.parent_id)
  const ids = new Set([client.id, ...brands.map((b) => b.id)])
  const work = tasks.filter((t) => ids.has(t.client_id) && t.status !== 'done')

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {group && <Link to={`/c/${group.slug}`} className="meta hover:underline">{group.name}</Link>}
          <h1 className="display text-xl">{client.name}</h1>
          <p className="meta mt-1">
            {[client.status === 'active' ? 'Active' : client.status, client.priority, client.services.join(', ')].filter(Boolean).join(' · ')}
            {client.website && <> · <a href={`https://${client.website.replace(/^https?:\/\//, '')}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:underline">{client.website}<External size={14} /></a></>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link className="btn" to={`/c/${client.slug}/board`}>Board</Link>
          <Link className="btn" to={`/c/${client.slug}/plans`}>Plans</Link>
          <Link className="btn" to={`/c/${client.slug}/time`}>Time</Link>
          <button className="btn btn-ink" onClick={() => open('new', { client: client.slug })}><Plus />New task</button>
        </div>
      </header>

      {brands.length > 0 && (
        <p className="mt-3 flex flex-wrap gap-2">
          {brands.map((b) => <Link key={b.id} to={`/c/${b.slug}`} className="chip hover:border-ink">{b.name}</Link>)}
        </p>
      )}

      <div className="grid gap-x-10 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0">
          <Snapshot client={client} />
          <Section title="Open work" count={work.length}>
            {work.length === 0 ? <Empty>No open work.</Empty> : work.map((t) => <TaskRow key={t.id} task={t} showClient={brands.length > 0} />)}
          </Section>
          <Accounts client={client} />
          <Contacts client={client} group={group} />
          <RecurringItems client={client} />
          <Scope client={client} />
          <Notes client={client} />
        </div>
        <aside className="min-w-0">
          <Section title="Conditions"><Conditions clientIds={ids} /></Section>
          <Hours ids={ids} />
        </aside>
      </div>
    </div>
  )
}

function Snapshot({ client }: { client: Client }) {
  const { clients, reload } = useData()
  const dlg = useRef<HTMLDialogElement>(null)
  const [f, setF] = useState(client)
  useEffect(() => setF(client), [client])
  const rows: [string, ReactNode][] = [
    ['Key metric', client.key_metric],
    ['Budget', client.budget],
    ['Reporting', client.reporting],
    ['Currency', client.currency],
  ]
  return (
    <Section title="Snapshot" action={<button className="btn btn-quiet" onClick={() => dlg.current?.showModal()}>Edit</button>}>
      <dl className="grid gap-x-6 sm:grid-cols-[9rem_1fr]">
        {rows.map(([k, v]) => [
          <dt key={`${k}t`} className="meta pt-2.5 sm:border-b sm:border-rule sm:pb-2.5">{k}</dt>,
          <dd key={`${k}d`} className="border-b border-rule pb-2.5 sm:pt-2.5">{v || <span className="text-mid">Not set</span>}</dd>,
        ])}
      </dl>
      <dialog ref={dlg} aria-label={`Edit ${client.name}`} className="m-auto w-[min(640px,calc(100vw-32px))] border border-rule bg-board p-0">
        <form className="space-y-3 p-5" onSubmit={async (e) => {
          e.preventDefault()
          const { name, status, priority, key_metric, budget, reporting, currency, website, parent_id } = f
          if (await run(supabase.from('clients').update({
            name: name.trim(), status, priority: priority || null, key_metric: key_metric || null, budget: budget || null, reporting: reporting || null,
            currency: currency.toUpperCase(), website: website || null, parent_id: parent_id || null, services: f.services,
          }).eq('id', client.id), 'Client saved')) { reload(); dlg.current?.close() }
        }}>
          <h2 className="text-l font-bold">Edit {client.name}</h2>
          <Input label="Name" value={f.name} onChange={(v) => setF({ ...f, name: v })} required />
          <div className="grid grid-cols-2 gap-3">
            <label><span className="label">Status</span>
              <select className="field" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
                {['active', 'setup', 'prospect', 'paused', 'ended'].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
              </select>
            </label>
            <Input label="Priority" value={f.priority ?? ''} onChange={(v) => setF({ ...f, priority: v })} />
            <label><span className="label">Group</span>
              <select className="field" value={f.parent_id ?? ''} onChange={(e) => setF({ ...f, parent_id: e.target.value || null })}>
                <option value="">Independent</option>
                {clients.filter((c) => !c.parent_id && c.id !== client.id).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <Input label="Currency" value={f.currency} onChange={(v) => setF({ ...f, currency: v })} />
          </div>
          <Input label="Services (comma separated)" value={f.services.join(', ')} onChange={(v) => setF({ ...f, services: v.split(',').map((s) => s.trim()).filter(Boolean) })} />
          <Input label="Key metric" value={f.key_metric ?? ''} onChange={(v) => setF({ ...f, key_metric: v })} />
          <Input label="Budget" value={f.budget ?? ''} onChange={(v) => setF({ ...f, budget: v })} />
          <Input label="Reporting" value={f.reporting ?? ''} onChange={(v) => setF({ ...f, reporting: v })} />
          <Input label="Website" value={f.website ?? ''} onChange={(v) => setF({ ...f, website: v })} />
          <div className="flex gap-2 pt-2"><button className="btn btn-ink">Save</button><button type="button" className="btn" onClick={() => dlg.current?.close()}>Cancel</button></div>
        </form>
      </dialog>
    </Section>
  )
}

function Accounts({ client }: { client: Client }) {
  const [rows, setRows] = useState<Account[]>([])
  const [adding, setAdding] = useState(false)
  const load = () => supabase.from('accounts').select('*').eq('client_id', client.id).order('platform').then(({ data }) => setRows(data ?? []))
  useEffect(() => { load() }, [client.id])
  return (
    <Section title="Accounts and IDs" count={rows.length} action={<button className="btn btn-quiet" onClick={() => setAdding(true)}><Plus size={16} />Add</button>}>
      {adding && <AccountForm client={client} onDone={() => { setAdding(false); load() }} />}
      {rows.length === 0 && !adding && <Empty>No account IDs recorded.</Empty>}
      {rows.map((a) => <AccountRow key={a.id} a={a} client={client} reload={load} />)}
    </Section>
  )
}

function AccountRow({ a, client, reload }: { a: Account; client: Client; reload: () => void }) {
  const [edit, setEdit] = useState(false)
  if (edit) return <AccountForm client={client} account={a} onDone={() => { setEdit(false); reload() }} />
  const rule = a.alert ? `Alert: ${a.alert.toUpperCase()} vs 60-day` : a.roas_floor ? `ROAS floor ${a.roas_floor}x` : ''
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-3 border-b border-rule py-2 md:grid-cols-[10rem_minmax(0,1fr)_auto]">
      <span className="meta">{PLATFORM_LABEL[a.platform]} · {KIND_LABEL[a.kind]}</span>
      <span className="col-start-1 min-w-0 md:col-start-auto">
        <span className="num break-all font-semibold">{a.external_id}</span>
        {(a.label || rule) && <span className="meta block">{[a.label, rule].filter(Boolean).join(' · ')}</span>}
        {a.last_sync_error && <span className="meta block text-red">Sync: {a.last_sync_error}</span>}
      </span>
      <span className="col-start-2 row-span-2 row-start-1 flex gap-1 md:col-start-auto md:row-span-1">
        <button className="btn btn-quiet" onClick={() => copyText(a.external_id, `Copied ${a.external_id}`)} aria-label={`Copy ${a.external_id}`}><Copy size={16} /></button>
        <button className="btn btn-quiet" onClick={() => setEdit(true)}>Edit</button>
      </span>
    </div>
  )
}

function AccountForm({ client, account, onDone }: { client: Client; account?: Account; onDone: () => void }) {
  const [f, setF] = useState({
    platform: account?.platform ?? 'meta', kind: account?.kind ?? 'ad_account', external_id: account?.external_id ?? '', label: account?.label ?? '',
    alert: account?.alert ?? '', roas_floor: account?.roas_floor?.toString() ?? '', conversion_event: account?.conversion_event ?? '', currency: account?.currency ?? client.currency,
  })
  const row = { ...f, client_id: client.id, label: f.label || null, alert: f.alert || null, conversion_event: f.conversion_event || null, roas_floor: f.roas_floor ? Number(f.roas_floor) : null, external_id: f.external_id.trim() }
  return (
    <form className="my-2 grid grid-cols-2 gap-3 border border-ink bg-board p-3 md:grid-cols-4" onSubmit={async (e) => {
      e.preventDefault()
      const op = account ? supabase.from('accounts').update(row).eq('id', account.id) : supabase.from('accounts').insert(row)
      if (await run(op, 'Saved')) onDone()
    }}>
      <label><span className="label">Platform</span><select className="field" value={f.platform} onChange={(e) => setF({ ...f, platform: e.target.value })}>{PLATFORMS.map((p) => <option key={p} value={p}>{PLATFORM_LABEL[p]}</option>)}</select></label>
      <label><span className="label">Kind</span><select className="field" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}>{KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select></label>
      <div className="col-span-2"><Input label="ID" value={f.external_id} onChange={(v) => setF({ ...f, external_id: v })} required /></div>
      <div className="col-span-2"><Input label="Label" value={f.label} onChange={(v) => setF({ ...f, label: v })} /></div>
      <label><span className="label">Alert rule</span>
        <select className="field" value={f.alert} onChange={(e) => setF({ ...f, alert: e.target.value })}>
          <option value="">None</option><option value="cpa">CPA +30% vs 60-day</option><option value="roas">ROAS −30% vs 60-day</option>
        </select>
      </label>
      <Input label="ROAS floor (x)" type="number" value={f.roas_floor} onChange={(v) => setF({ ...f, roas_floor: v })} />
      <div className="col-span-2"><Input label="Meta conversion event (e.g. lead, omni_purchase)" value={f.conversion_event} onChange={(v) => setF({ ...f, conversion_event: v })} /></div>
      <Input label="Currency" value={f.currency} onChange={(v) => setF({ ...f, currency: v.toUpperCase() })} />
      <div className="col-span-2 flex items-end gap-2 md:col-span-3">
        <button className="btn btn-ink">Save</button>
        <button type="button" className="btn" onClick={onDone}>Cancel</button>
        {account && <button type="button" className="btn btn-quiet ml-auto" onClick={async () => { if (await run(supabase.from('accounts').delete().eq('id', account.id), 'Removed')) onDone() }}><Trash size={16} />Remove</button>}
      </div>
    </form>
  )
}

function Contacts({ client, group }: { client: Client; group?: Client }) {
  const [rows, setRows] = useState<Contact[]>([])
  const [edit, setEdit] = useState<Contact | 'new' | null>(null)
  const load = () => supabase.from('contacts').select('*').in('client_id', [client.id, ...(group ? [group.id] : [])]).order('is_primary', { ascending: false }).then(({ data }) => setRows(data ?? []))
  useEffect(() => { load() }, [client.id])
  return (
    <Section title="Contacts" count={rows.length} action={<button className="btn btn-quiet" onClick={() => setEdit('new')}><Plus size={16} />Add</button>}>
      {edit === 'new' && <ContactForm client={client} onDone={() => { setEdit(null); load() }} />}
      {rows.length === 0 && edit !== 'new' && <Empty>No contacts recorded.</Empty>}
      {rows.map((c) => edit !== 'new' && edit?.id === c.id ? <ContactForm key={c.id} client={client} contact={c} onDone={() => { setEdit(null); load() }} /> : (
        <div key={c.id} className="grid grid-cols-[1fr_auto] gap-x-3 border-b border-rule py-2 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)_auto]">
          <span><span className="font-semibold">{c.name}</span>{c.is_primary && <span className="meta"> · primary</span>}{c.client_id !== client.id && <span className="meta block">via {group?.name}</span>}<span className="meta block">{c.role}</span></span>
          <span className="col-start-1 min-w-0 md:col-start-auto">
            {c.email && <a className="block truncate hover:underline" href={`mailto:${c.email}`}>{c.email}</a>}
            {c.phone && <a className="num block hover:underline" href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a>}
            <span className="meta">{[c.preferred_channel && `Prefers ${c.preferred_channel}`, c.notes].filter(Boolean).join(' · ')}</span>
          </span>
          <button className="btn btn-quiet col-start-2 row-start-1 md:col-start-auto" onClick={() => setEdit(c)}>Edit</button>
        </div>
      ))}
    </Section>
  )
}

function ContactForm({ client, contact, onDone }: { client: Client; contact?: Contact; onDone: () => void }) {
  const [f, setF] = useState({ name: contact?.name ?? '', role: contact?.role ?? '', email: contact?.email ?? '', phone: contact?.phone ?? '', preferred_channel: contact?.preferred_channel ?? '', notes: contact?.notes ?? '', is_primary: contact?.is_primary ?? false })
  const row = { client_id: contact?.client_id ?? client.id, name: f.name.trim(), role: f.role || null, email: f.email || null, phone: f.phone || null, preferred_channel: f.preferred_channel || null, notes: f.notes || null, is_primary: f.is_primary }
  return (
    <form className="my-2 grid grid-cols-2 gap-3 border border-ink bg-board p-3" onSubmit={async (e) => {
      e.preventDefault()
      const op = contact ? supabase.from('contacts').update(row).eq('id', contact.id) : supabase.from('contacts').insert(row)
      if (await run(op, 'Saved')) onDone()
    }}>
      <Input label="Name" value={f.name} onChange={(v) => setF({ ...f, name: v })} required />
      <Input label="Role" value={f.role} onChange={(v) => setF({ ...f, role: v })} />
      <Input label="Email" type="email" value={f.email} onChange={(v) => setF({ ...f, email: v })} />
      <Input label="Phone" value={f.phone} onChange={(v) => setF({ ...f, phone: v })} />
      <Input label="Prefers (Email, Slack, Call / SMS)" value={f.preferred_channel} onChange={(v) => setF({ ...f, preferred_channel: v })} />
      <Input label="Notes" value={f.notes} onChange={(v) => setF({ ...f, notes: v })} />
      <label className="col-span-2 flex items-center gap-2"><input type="checkbox" className="size-4 accent-[var(--ink)]" checked={f.is_primary} onChange={(e) => setF({ ...f, is_primary: e.target.checked })} />Primary contact</label>
      <div className="col-span-2 flex gap-2">
        <button className="btn btn-ink">Save</button><button type="button" className="btn" onClick={onDone}>Cancel</button>
        {contact && <button type="button" className="btn btn-quiet ml-auto" onClick={async () => { if (await run(supabase.from('contacts').delete().eq('id', contact.id), 'Removed')) onDone() }}><Trash size={16} />Remove</button>}
      </div>
    </form>
  )
}

function RecurringItems({ client }: { client: Client }) {
  const [rows, setRows] = useState<Recurring[]>([])
  const [edit, setEdit] = useState<Recurring | 'new' | null>(null)
  const load = () => supabase.from('recurring').select('*').eq('client_id', client.id).order('next_due').then(({ data }) => setRows(data ?? []))
  useEffect(() => { load() }, [client.id])
  const every = (r: Recurring) => (r.cadence === 'monthly' ? `Monthly on the ${ordinal(r.day ?? 1)}` : r.cadence === 'weekly' ? 'Weekly' : 'Fortnightly')
  return (
    <Section title="Recurring" count={rows.length} action={<button className="btn btn-quiet" onClick={() => setEdit('new')}><Plus size={16} />Add</button>}>
      {edit === 'new' && <RecurringForm client={client} onDone={() => { setEdit(null); load() }} />}
      {rows.length === 0 && edit !== 'new' && <Empty>No recurring reports or reviews.</Empty>}
      {rows.map((r) => edit !== 'new' && edit?.id === r.id ? <RecurringForm key={r.id} client={client} item={r} onDone={() => { setEdit(null); load() }} /> : (
        <div key={r.id} className="grid grid-cols-[1fr_auto] gap-x-3 border-b border-rule py-2">
          <span>
            <span className={`font-semibold ${r.active ? '' : 'text-mid line-through'}`}>{r.title}</span>
            <span className="meta block">{every(r)} · next due {longDate(r.next_due)} · task appears {r.lead_days} days before</span>
          </span>
          <button className="btn btn-quiet" onClick={() => setEdit(r)}>Edit</button>
        </div>
      ))}
    </Section>
  )
}

function RecurringForm({ client, item, onDone }: { client: Client; item?: Recurring; onDone: () => void }) {
  const { profiles } = useData()
  const [f, setF] = useState({
    title: item?.title ?? '', type: item?.type ?? 'report', cadence: item?.cadence ?? 'monthly', day: item?.day?.toString() ?? '1',
    next_due: item?.next_due ?? today(), lead_days: item?.lead_days?.toString() ?? '3', assignee_id: item?.assignee_id ?? '', template: item?.template ?? '', active: item?.active ?? true,
  })
  const row = {
    client_id: client.id, title: f.title.trim(), type: f.type, cadence: f.cadence, day: f.cadence === 'monthly' ? Number(f.day) : null,
    next_due: f.next_due, lead_days: Number(f.lead_days), assignee_id: f.assignee_id || null, template: f.template, active: f.active,
  }
  return (
    <form className="my-2 grid grid-cols-2 gap-3 border border-ink bg-board p-3 md:grid-cols-4" onSubmit={async (e) => {
      e.preventDefault()
      const op = item ? supabase.from('recurring').update(row).eq('id', item.id) : supabase.from('recurring').insert(row)
      if (await run(op, 'Saved')) onDone()
    }}>
      <div className="col-span-2 md:col-span-4"><Input label="Task title" value={f.title} onChange={(v) => setF({ ...f, title: v })} required /></div>
      <label><span className="label">Repeats</span>
        <select className="field" value={f.cadence} onChange={(e) => setF({ ...f, cadence: e.target.value })}>
          <option value="weekly">Weekly</option><option value="fortnightly">Fortnightly</option><option value="monthly">Monthly</option>
        </select>
      </label>
      {f.cadence === 'monthly' && <Input label="Day of month" type="number" value={f.day} onChange={(v) => setF({ ...f, day: v })} required />}
      <Input label="Next due" type="date" value={f.next_due} onChange={(v) => setF({ ...f, next_due: v })} required />
      <Input label="Create it this many days early" type="number" value={f.lead_days} onChange={(v) => setF({ ...f, lead_days: v })} required />
      <label><span className="label">Type</span><select className="field" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>{TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label>
      <label><span className="label">Assignee</span>
        <select className="field" value={f.assignee_id} onChange={(e) => setF({ ...f, assignee_id: e.target.value })}>
          <option value="">Nobody yet</option>{profiles.filter((p) => p.role).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
        </select>
      </label>
      <label className="col-span-2 md:col-span-4"><span className="label">Steps for each task (lines like "- [ ] Pull the data")</span>
        <textarea className="field min-h-28" value={f.template} maxLength={5000} onChange={(e) => setF({ ...f, template: e.target.value })} />
      </label>
      <label className="flex items-center gap-2"><input type="checkbox" className="size-4 accent-[var(--ink)]" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} />Active</label>
      <div className="col-span-2 flex gap-2 md:col-span-3">
        <button className="btn btn-ink">Save</button><button type="button" className="btn" onClick={onDone}>Cancel</button>
        {item && <button type="button" className="btn btn-quiet ml-auto" onClick={async () => { if (await run(supabase.from('recurring').delete().eq('id', item.id), 'Removed')) onDone() }}><Trash size={16} />Remove</button>}
      </div>
    </form>
  )
}

// Contracted deliverables per month, by task type. Blank means no quota; plans hide the scope meter until one exists.
function Scope({ client }: { client: Client }) {
  const [quotas, setQuotas] = useState<Record<string, number>>({})
  useEffect(() => {
    supabase.from('scope_quotas').select('*').eq('client_id', client.id).then(({ data }) => setQuotas(Object.fromEntries((data ?? []).map((q) => [q.type, q.monthly_quota]))))
  }, [client.id])
  const save = async (type: string, raw: string) => {
    const n = raw === '' ? null : Math.max(0, Math.round(Number(raw)))
    if ((quotas[type] ?? null) === n) return
    const op = n == null
      ? supabase.from('scope_quotas').delete().eq('client_id', client.id).eq('type', type)
      : supabase.from('scope_quotas').upsert({ client_id: client.id, type, monthly_quota: n })
    if (await run(op, 'Scope saved')) setQuotas((q) => { const next = { ...q }; if (n == null) delete next[type]; else next[type] = n; return next })
  }
  return (
    <Section title="Monthly scope">
      <p className="meta pt-2">Deliverables per month by task type. Leave blank where there is no quota.</p>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {TYPES.map(([k, l]) => (
          <label key={k}><span className="label">{l}</span>
            <input className="field num" type="number" min={0} max={999} defaultValue={quotas[k] ?? ''} key={`${k}${quotas[k] ?? ''}`} onBlur={(e) => save(k, e.target.value)} />
          </label>
        ))}
      </div>
    </Section>
  )
}

function Notes({ client }: { client: Client }) {
  const { reload } = useData()
  const [edit, setEdit] = useState(false)
  const [text, setText] = useState(client.notes)
  useEffect(() => setText(client.notes), [client.notes])
  return (
    <Section title="Working rules and open items" action={<button className="btn btn-quiet" onClick={() => setEdit(!edit)}>{edit ? 'Cancel' : 'Edit'}</button>}>
      {edit ? (
        <form className="mt-2" onSubmit={async (e) => { e.preventDefault(); if (await run(supabase.from('clients').update({ notes: text }).eq('id', client.id), 'Notes saved')) { setEdit(false); reload() } }}>
          <textarea className="field min-h-72" value={text} maxLength={20000} onChange={(e) => setText(e.target.value)} aria-label="Notes" />
          <button className="btn btn-ink mt-2">Save notes</button>
        </form>
      ) : client.notes.trim() ? (
        <div className="mt-2 max-w-[75ch] whitespace-pre-wrap">{client.notes}</div>
      ) : <Empty>No notes yet.</Empty>}
    </Section>
  )
}

function Hours({ ids }: { ids: Set<string> }) {
  const { person } = useLookups()
  const [rows, setRows] = useState<{ user_id: string; hours: number }[]>([])
  const key = [...ids].join()
  useEffect(() => {
    supabase.from('time_entries').select('user_id, hours').in('client_id', [...ids]).gte('date', monthStart(today()))
      .then(({ data }) => setRows(data ?? []))
  }, [key])
  const by = new Map<string, number>()
  for (const r of rows) by.set(r.user_id, (by.get(r.user_id) ?? 0) + Number(r.hours))
  const total = [...by.values()].reduce((a, b) => a + b, 0)
  return (
    <Section title="Hours this month" action={<span className="num font-semibold">{hours(total)}</span>}>
      {by.size === 0 ? <Empty>No time logged this month.</Empty> : [...by].map(([id, h]) => (
        <p key={id} className="flex justify-between border-b border-rule py-2"><span>{person(id)}</span><span className="num">{hours(h)}</span></p>
      ))}
    </Section>
  )
}

const ordinal = (n: number) =>
  `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`

function Input({ label, value, onChange, type = 'text', required }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return (
    <label className="block"><span className="label">{label}</span>
      <input className="field" type={type} value={value} required={required} step={type === 'number' ? 'any' : undefined} onChange={(e) => onChange(e.target.value)} />
    </label>
  )
}
