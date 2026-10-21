import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { run, useData, useLookups, useScope } from '../lib/data'
import type { Tables } from '../lib/database.types'
import { addDays, hours, iso, monthStart, shortDate, today, toCsv } from '../lib/format'
import { ref } from '../lib/model'
import { Empty, Section } from '../components/bits'
import { Trash } from '../components/Icons'

type Entry = Tables<'time_entries'>

function period(kind: string): [string, string] {
  const t = today()
  const d = new Date(`${t}T12:00:00`)
  if (kind === 'last-month') {
    const first = new Date(d.getFullYear(), d.getMonth() - 1, 1)
    return [iso(first), iso(new Date(d.getFullYear(), d.getMonth(), 0))]
  }
  if (kind === 'week') return [addDays(t, -((d.getDay() + 6) % 7)), t]
  if (kind === '30') return [addDays(t, -29), t]
  return [monthStart(t), t]
}

export function Time() {
  const { clients, tasks, me } = useData()
  const { client, has } = useScope()
  const { clientName, person } = useLookups()
  const [kind, setKind] = useState('month')
  const [[from, to], setRange] = useState(period('month'))
  const [rows, setRows] = useState<Entry[] | null>(null)
  const [names, setNames] = useState<Map<string, string>>(new Map())

  const load = async () => {
    const { data } = await supabase.from('time_entries').select('*').gte('date', from).lte('date', to).order('date', { ascending: false }).limit(2000)
    const list = (data ?? []).filter((e) => has(e.client_id))
    setRows(list)
    // Task titles for entries on older tasks that aren't in the loaded set.
    const ids = [...new Set(list.map((e) => e.task_id).filter((x): x is string => !!x))]
    if (ids.length) {
      const { data: t } = await supabase.from('tasks').select('id, ref, title').in('id', ids)
      setNames(new Map((t ?? []).map((x) => [x.id, `${ref(x.ref)} ${x.title}`])))
    }
  }
  useEffect(() => { load() }, [from, to, client?.id])

  const sum = (by: (e: Entry) => string) => {
    const m = new Map<string, number>()
    for (const e of rows ?? []) m.set(by(e), (m.get(by(e)) ?? 0) + Number(e.hours))
    return [...m].sort((a, b) => b[1] - a[1])
  }
  const total = (rows ?? []).reduce((s, e) => s + Number(e.hours), 0)
  const byClient = sum((e) => clientName(e.client_id))
  const byPerson = sum((e) => person(e.user_id))

  const exportCsv = () => {
    const csv = toCsv([
      ['Date', 'Client', 'Task', 'Person', 'Hours', 'Note'],
      ...(rows ?? []).map((e) => [e.date, clientName(e.client_id), e.task_id ? names.get(e.task_id) ?? '' : '', person(e.user_id), Number(e.hours), e.note]),
    ])
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    a.download = `fsd-time-${client?.slug ?? 'all'}-${from}-to-${to}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-xl">{client ? `${client.name} time` : 'Time'}</h1>
          <p className="meta num mt-1">{hours(total)} from {shortDate(from)} to {shortDate(to)}</p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label><span className="label">Period</span>
            <select className="field w-auto" value={kind} onChange={(e) => { setKind(e.target.value); if (e.target.value !== 'custom') setRange(period(e.target.value)) }}>
              <option value="month">This month</option><option value="last-month">Last month</option><option value="week">This week</option>
              <option value="30">Last 30 days</option><option value="custom">Custom</option>
            </select>
          </label>
          {kind === 'custom' && (
            <>
              <label><span className="label">From</span><input type="date" className="field num w-auto" value={from} onChange={(e) => e.target.value && setRange([e.target.value, to])} /></label>
              <label><span className="label">To</span><input type="date" className="field num w-auto" value={to} onChange={(e) => e.target.value && setRange([from, e.target.value])} /></label>
            </>
          )}
          <button className="btn" onClick={exportCsv} disabled={!rows?.length}>Export CSV</button>
        </div>
      </header>

      <LogForm onSaved={load} defaultClient={client?.id} clients={clients.filter((c) => has(c.id))} tasks={tasks} me={me?.id} />

      <div className="grid gap-x-10 md:grid-cols-2">
        <Bars title="By client" rows={byClient} total={total} />
        <Bars title="By person" rows={byPerson} total={total} />
      </div>

      <Section title="Entries" count={rows?.length}>
        {rows === null ? <Empty>Loading time…</Empty> : rows.length === 0 ? <Empty>No time logged in this period.</Empty> : (
          <div className="overflow-x-auto">
            <table className="table min-w-[720px]">
              <thead><tr><th>Date</th><th>Client</th><th>Task</th><th>Person</th><th className="r">Hours</th><th>Note</th><th /></tr></thead>
              <tbody>
                {rows.map((e) => (
                  <tr key={e.id}>
                    <td className="num whitespace-nowrap">{shortDate(e.date)}</td>
                    <td>{clientName(e.client_id)}</td>
                    <td className="max-w-80">{e.task_id ? names.get(e.task_id) : <span className="text-mid">General</span>}</td>
                    <td>{person(e.user_id)}</td>
                    <td className="r font-semibold">{hours(Number(e.hours))}</td>
                    <td className="max-w-64 text-mid">{e.note}</td>
                    <td className="r">{e.user_id === me?.id && (
                      <button className="btn btn-quiet" aria-label="Delete entry" onClick={async () => { if (await run(supabase.from('time_entries').delete().eq('id', e.id), 'Entry deleted')) load() }}><Trash size={16} /></button>
                    )}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  )
}

function Bars({ title, rows, total }: { title: string; rows: [string, number][]; total: number }) {
  const top = Math.max(1, ...rows.map(([, h]) => h))
  return (
    <Section title={title}>
      {rows.length === 0 ? <Empty>Nothing yet.</Empty> : rows.map(([name, h]) => (
        <div key={name} className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_4.5rem] items-center gap-3 border-b border-rule py-2">
          <span className="truncate">{name}</span>
          <span className="h-2 bg-rule"><span className="block h-2 bg-teal" style={{ width: `${(h / top) * 100}%` }} /></span>
          <span className="num text-right font-semibold">{hours(h)}<span className="meta block">{Math.round((h / (total || 1)) * 100)}%</span></span>
        </div>
      ))}
    </Section>
  )
}

function LogForm({ onSaved, defaultClient, clients, tasks, me }: {
  onSaved: () => void; defaultClient?: string; clients: Tables<'clients'>[]; tasks: Tables<'tasks'>[]; me?: string
}) {
  const [clientId, setClientId] = useState(defaultClient ?? '')
  const [taskId, setTaskId] = useState('')
  const [date, setDate] = useState(today())
  const [h, setH] = useState('')
  const [note, setNote] = useState('')
  useEffect(() => setClientId(defaultClient ?? ''), [defaultClient])
  const open = tasks.filter((t) => t.client_id === clientId && t.status !== 'done')
  return (
    <Section title="Log time">
      <form className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_9rem_6rem_minmax(0,1fr)_auto] md:items-end" onSubmit={async (e) => {
        e.preventDefault()
        const hrs = Number(h)
        if (!clientId || !(hrs > 0 && hrs <= 24)) return
        if (await run(supabase.from('time_entries').insert({ client_id: clientId, task_id: taskId || null, date, hours: hrs, note: note.trim() || null, user_id: me }), `Logged ${hours(hrs)}`)) {
          setH(''); setNote(''); setTaskId(''); onSaved()
        }
      }}>
        <label><span className="label">Client</span>
          <select className="field" required value={clientId} onChange={(e) => { setClientId(e.target.value); setTaskId('') }}>
            <option value="" disabled>Choose…</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label><span className="label">Task (optional)</span>
          <select className="field" value={taskId} onChange={(e) => setTaskId(e.target.value)} disabled={!clientId}>
            <option value="">General work or a meeting</option>{open.map((t) => <option key={t.id} value={t.id}>{ref(t.ref)} {t.title}</option>)}
          </select>
        </label>
        <label><span className="label">Date</span><input type="date" className="field num" required value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label><span className="label">Hours</span><input type="number" className="field num" required step="0.25" min="0.25" max="24" value={h} onChange={(e) => setH(e.target.value)} /></label>
        <label className="col-span-2 md:col-span-1"><span className="label">Note</span><input className="field" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <button className="btn btn-ink col-span-2 md:col-span-1">Log time</button>
      </form>
    </Section>
  )
}
