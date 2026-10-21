import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { run, useData, useLookups, useScope, useTaskLink, type Task } from '../lib/data'
import type { Json, Tables } from '../lib/database.types'
import { aud, monthName, monthStart, shortDate, stamp, today } from '../lib/format'
import { TYPES, typeLabel } from '../lib/model'
import { Empty, Section, TaskRow } from '../components/bits'
import { Flag, Plus } from '../components/Icons'

type Plan = Tables<'plans'>
type Pace = Tables<'plan_pacing'>

const AD_PLATFORMS: [string, string, string][] = [['meta', 'Meta', 'Meta'], ['google', 'Google', 'Google Ads'], ['bing', 'Bing', 'Microsoft Ads'], ['openai', 'OpenAI Ads', 'OpenAI Ads'], ['tiktok', 'TikTok', 'TikTok']]
const STATUS: Record<string, string> = { draft: 'Draft', review: 'Waiting for sign-off', approved: 'Approved' }
const budgetsOf = (b: Json) => (b && typeof b === 'object' && !Array.isArray(b) ? (b as Record<string, number>) : {})

export function Plans() {
  const { clients } = useData()
  const { client, has, base } = useScope()
  const navigate = useNavigate()
  const [month, setMonth] = useState(monthStart(today()))
  const [plans, setPlans] = useState<Plan[] | null>(null)
  const [counts, setCounts] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    let q = supabase.from('plans').select('*').order('month', { ascending: false })
    q = client ? q.in('client_id', clients.filter((c) => has(c.id)).map((c) => c.id)) : q.eq('month', month)
    q.then(async ({ data }) => {
      setPlans(data ?? [])
      const ids = (data ?? []).map((p) => p.id)
      if (!ids.length) return setCounts(new Map())
      const { data: t } = await supabase.from('tasks').select('plan_id').in('plan_id', ids)
      const m = new Map<string, number>()
      for (const x of t ?? []) m.set(x.plan_id!, (m.get(x.plan_id!) ?? 0) + 1)
      setCounts(m)
    })
  }, [client?.id, month, clients.length])

  const start = async (clientId: string, m = month) => {
    const { data, error } = await supabase.from('plans').insert({ client_id: clientId, month: m }).select().single()
    if (error) return run(Promise.resolve({ error }))
    navigate(`/plans/${data.id}`)
  }
  // Clients you'd plan for: active, not a group row.
  const plannable = clients.filter((c) => c.status === 'active' && !clients.some((x) => x.parent_id === c.id) && has(c.id))
  const without = plannable.filter((c) => !plans?.some((p) => p.client_id === c.id && p.month === month))

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-xl">{client ? `${client.name} plans` : 'Plans'}</h1>
          <p className="meta mt-1">Each month's plan: budgets by platform, the work planned, and how it sits against scope.</p>
        </div>
        <label className="flex items-center gap-2"><span className="meta">Month</span>
          <input type="month" className="field w-auto num" value={month.slice(0, 7)} onChange={(e) => e.target.value && setMonth(`${e.target.value}-01`)} />
        </label>
      </header>

      <Section title={client ? 'All months' : monthName(month)} count={plans?.length}>
        {plans === null ? <Empty>Loading plans…</Empty> : plans.length === 0 ? <Empty>No plans yet.</Empty> : plans.map((p) => {
          const total = Object.values(budgetsOf(p.budgets)).reduce((a, b) => a + Number(b || 0), 0)
          return (
            <Link key={p.id} to={`/plans/${p.id}`} className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-3 border-b border-rule py-2.5 hover:bg-board md:grid-cols-[22px_minmax(0,14rem)_minmax(0,1fr)_auto]">
              <Flag raised={p.status === 'approved'} />
              <span className="font-semibold">{client ? monthName(p.month) : clients.find((c) => c.id === p.client_id)?.name}</span>
              <span className="meta hidden md:block">{STATUS[p.status]} · {counts.get(p.id) ?? 0} activities</span>
              <span className="num font-semibold">{total ? aud(total) : <span className="meta">No budget set</span>}</span>
            </Link>
          )
        })}
      </Section>

      {without.length > 0 && (
        <Section title={`No plan for ${monthName(month)}`} count={without.length}>
          {without.map((c) => (
            <div key={c.id} className="flex items-center justify-between gap-3 border-b border-rule py-2">
              <span className="font-semibold">{c.name}</span>
              <button className="btn" onClick={() => start(c.id)}><Plus size={16} />Start plan</button>
            </div>
          ))}
        </Section>
      )}
      {base && <p className="meta mt-6"><Link to={base} className="hover:underline">Back to {client?.name}</Link></p>}
    </div>
  )
}

export function PlanPage() {
  const { id } = useParams()
  const { clients, tasks, reload } = useData()
  const { person } = useLookups()
  const { open } = useTaskLink()
  const [plan, setPlan] = useState<Plan | null>(null)
  const [items, setItems] = useState<Task[]>([])
  const [pace, setPace] = useState<Pace[]>([])
  const [quotas, setQuotas] = useState<Tables<'scope_quotas'>[]>([])
  const [notes, setNotes] = useState('')

  const load = async () => {
    const { data: p } = await supabase.from('plans').select('*').eq('id', id!).maybeSingle()
    if (!p) return setPlan(null)
    const [t, pc, q] = await Promise.all([
      supabase.from('tasks').select('*').eq('plan_id', p.id).order('ref'),
      supabase.from('plan_pacing').select('*').eq('plan_id', p.id),
      supabase.from('scope_quotas').select('*').eq('client_id', p.client_id),
    ])
    setPlan(p); setNotes(p.notes); setItems(t.data ?? []); setPace(pc.data ?? []); setQuotas(q.data ?? [])
  }
  useEffect(() => { load() }, [id, tasks])

  if (!plan) return <Empty>Loading plan…</Empty>
  const client = clients.find((c) => c.id === plan.client_id)
  const budgets = budgetsOf(plan.budgets)
  const platforms = AD_PLATFORMS.filter(([k, , service]) => client?.services.includes(service) || k in budgets)
  const used = (type: string) => items.filter((t) => t.type === type).length
  const unplanned = tasks.filter((t) => t.client_id === plan.client_id && !t.plan_id && t.status !== 'done')

  const update = async (fields: Partial<Plan>, done?: string) => { if (await run(supabase.from('plans').update(fields).eq('id', plan.id), done)) load() }
  const setBudget = (k: string, raw: string) => {
    const next = { ...budgets }
    if (raw === '') delete next[k]; else next[k] = Math.max(0, Number(raw))
    if (JSON.stringify(next) !== JSON.stringify(budgets)) update({ budgets: next })
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to={`/c/${client?.slug}/plans`} className="meta hover:underline">{client?.name} plans</Link>
          <h1 className="display text-xl">{monthName(plan.month)}</h1>
          <p className="meta mt-1 flex items-center gap-2"><Flag raised={plan.status === 'approved'} size={16} />
            {STATUS[plan.status]}{plan.approved_at && ` by ${person(plan.approved_by)} · ${stamp(plan.approved_at)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {plan.status === 'draft' && <button className="btn btn-ink" onClick={() => update({ status: 'review' }, 'Sent for sign-off')}><Flag raised={false} />Send for sign-off</button>}
          {plan.status === 'review' && <button className="btn btn-ink" onClick={() => update({ status: 'approved' }, 'Plan approved')}><Flag />Approve plan</button>}
          {plan.status !== 'draft' && <button className="btn" onClick={() => update({ status: 'draft' }, 'Back to draft')}>Back to draft</button>}
        </div>
      </header>

      <div className="grid gap-x-10 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <Section title="Budgets and pacing">
            <p className="meta pt-2">Monthly budget per platform. Spend and the month-end projection come from the nightly sync.</p>
            {platforms.length === 0 && <Empty>This client has no ad platforms listed.</Empty>}
            {platforms.map(([k, label]) => {
              const p = pace.find((x) => x.platform === k)
              const budget = budgets[k]
              const projected = p?.projected ?? null
              const ratio = budget && projected != null ? projected / budget : null
              const verdict = ratio == null ? '' : ratio > 1.05 ? 'Over pace' : ratio < 0.9 ? 'Under pace' : 'On pace'
              return (
                <div key={k} className="grid grid-cols-[7rem_minmax(0,1fr)] items-center gap-3 border-b border-rule py-3 md:grid-cols-[7rem_10rem_minmax(0,1fr)]">
                  <span className="font-semibold">{label}</span>
                  <label className="flex items-center gap-2"><span className="meta">A$</span>
                    <input aria-label={`${label} budget`} className="field num" type="number" min={0} step={50} defaultValue={budget ?? ''} key={`${k}${budget}`} onBlur={(e) => setBudget(k, e.target.value)} />
                  </label>
                  <div className="col-span-2 md:col-span-1">
                    {p?.data_through ? (
                      <>
                        <div className="relative h-2 bg-rule">
                          <span className="absolute inset-y-0 left-0 bg-teal" style={{ width: `${Math.min(100, budget ? (Number(p.spend_mtd) / budget) * 100 : 0)}%` }} />
                          {budget && projected != null && <span className="absolute -top-1 h-4 w-0.5 bg-ink" style={{ left: `${Math.min(100, (projected / budget) * 100)}%` }} title="Projected month end" />}
                        </div>
                        <p className={`meta num mt-1 ${verdict === 'Over pace' ? 'font-semibold text-red' : ''}`}>
                          {aud(Number(p.spend_mtd))} spent to {shortDate(p.data_through)} · projected {aud(projected)}{verdict && ` · ${verdict}`}
                        </p>
                      </>
                    ) : <p className="meta">No spend data yet.</p>}
                  </div>
                </div>
              )
            })}
          </Section>

          <Section title="Activities" count={items.length} action={<button className="btn btn-quiet" onClick={() => open('new', { client: client?.slug ?? '', plan: plan.id })}><Plus size={16} />Add activity</button>}>
            {items.length === 0 ? <Empty>No activities in this plan yet.</Empty> : items.map((t) => <TaskRow key={t.id} task={t} showClient={false} />)}
            {unplanned.length > 0 && (
              <label className="mt-3 flex items-center gap-2"><span className="meta shrink-0">Add an open task</span>
                <select className="field" value="" onChange={async (e) => { if (e.target.value && (await run(supabase.from('tasks').update({ plan_id: plan.id }).eq('id', e.target.value), 'Added to plan'))) reload() }}>
                  <option value="">Choose…</option>
                  {unplanned.map((t) => <option key={t.id} value={t.id}>FSD-{t.ref} {t.title}</option>)}
                </select>
              </label>
            )}
          </Section>

          <Section title="Notes">
            <textarea className="field mt-2 min-h-32" aria-label="Plan notes" maxLength={20000} value={notes}
              placeholder="Strategy for the month, what changed, what to watch." onChange={(e) => setNotes(e.target.value)}
              onBlur={() => notes !== plan.notes && update({ notes }, 'Notes saved')} />
          </Section>
        </div>

        <aside className="min-w-0">
          <Section title="Scope this month">
            {quotas.length === 0 ? (
              <Empty>No contracted scope set for {client?.name}. Add quotas on the <Link className="underline" to={`/c/${client?.slug}`}>client page</Link> to see the meter.</Empty>
            ) : TYPES.filter(([k]) => quotas.some((q) => q.type === k) || used(k) > 0).map(([k]) => {
              const quota = quotas.find((q) => q.type === k)?.monthly_quota ?? 0
              const n = used(k)
              const over = n > quota
              return (
                <div key={k} className="border-b border-rule py-2.5">
                  <p className="flex justify-between"><span className="font-semibold">{typeLabel(k)}</span>
                    <span className={`num ${over ? 'font-semibold text-red' : ''}`}>{n} of {quota}{over && ` · ${n - quota} over`}{n < quota && <span className="meta"> · {quota - n} to plan</span>}</span>
                  </p>
                  <div className="mt-1.5 flex gap-0.5" role="img" aria-label={`${n} of ${quota} used`}>
                    {Array.from({ length: Math.max(quota, n) }, (_, i) => (
                      <span key={i} className={`h-2 flex-1 ${i < Math.min(n, quota) ? 'bg-teal' : i < quota ? 'bg-rule' : 'bg-red'}`} />
                    ))}
                  </div>
                </div>
              )
            })}
          </Section>
          <PlanComments planId={plan.id} person={person} />
        </aside>
      </div>
    </div>
  )
}

function PlanComments({ planId, person }: { planId: string; person: (id: string | null) => string }) {
  const [rows, setRows] = useState<Tables<'comments'>[]>([])
  const [body, setBody] = useState('')
  const load = () => supabase.from('comments').select('*').eq('plan_id', planId).order('created_at').then(({ data }) => setRows(data ?? []))
  useEffect(() => { load() }, [planId])
  return (
    <Section title="Comments" count={rows.length}>
      {rows.map((c) => (
        <div key={c.id} className="border-b border-rule py-2">
          <p className="meta"><span className="font-semibold text-ink">{person(c.author_id)}</span> · {stamp(c.created_at)}</p>
          <p className="whitespace-pre-wrap">{c.body}</p>
        </div>
      ))}
      <form className="mt-3" onSubmit={async (e) => { e.preventDefault(); if (body.trim() && (await run(supabase.from('comments').insert({ plan_id: planId, body: body.trim() })))) { setBody(''); load() } }}>
        <textarea aria-label="Comment on this plan" className="field min-h-20" maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} />
        <button className="btn mt-2" disabled={!body.trim()}>Post comment</button>
      </form>
    </Section>
  )
}
