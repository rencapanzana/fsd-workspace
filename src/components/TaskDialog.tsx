import { useEffect, useRef, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { run, taskUrl, toast, useData, useLookups, useTaskLink, type Task } from '../lib/data'
import type { Tables, Database } from '../lib/database.types'
import { checklist, toggle, TEMPLATES } from '../lib/checklist'
import { hours, monthName, shortDate, stamp, today } from '../lib/format'
import { PRIORITIES, ref, STATUSES, statusLabel, TYPES, type TaskType } from '../lib/model'
import { slackTask } from '../lib/slack'
import { copyText, StatusMark } from './bits'
import { Close, Copy, External, Flag, Stop, Timer, Trash } from './Icons'

type Form = Database['public']['Tables']['tasks']['Insert']
// The database numbers tasks; a loaded task's ref never goes back up.
const toForm = ({ ref: _ref, ...rest }: Task): Form => rest
type Comment = Tables<'comments'>
type TaskEvent = Tables<'task_events'>
type Entry = Tables<'time_entries'>

export function TaskDialog() {
  const { tasks, clients, profiles, me, reload } = useData()
  const { current, close, params, open } = useTaskLink()
  const dlg = useRef<HTMLDialogElement>(null)
  const isNew = current === 'new'
  const num = Number(current)
  const known = tasks.find((t) => t.ref === num)
  const [task, setTask] = useState<Task | null>(known ?? null)
  const [form, setForm] = useState<Form>(() => {
    const type = (params.get('type') as TaskType) || 'admin'
    const client = clients.find((c) => c.slug === params.get('client'))
    return known ? toForm(known) : {
      client_id: client?.id ?? '', title: '', type, priority: 'normal', status: 'todo', assignee_id: me?.id ?? null,
      description: TEMPLATES[type] ?? '', ads: '', due_date: null, brief_url: null, from_client: false, plan_id: params.get('plan'),
    }
  })

  useEffect(() => { dlg.current?.showModal() }, [])
  useEffect(() => {
    if (isNew || known) return
    supabase.from('tasks').select('*').eq('ref', num).maybeSingle().then(({ data }) => {
      if (data) { setTask(data); setForm(toForm(data)) } else { toast("That task doesn't exist any more."); close() }
    })
  }, []) // first open only: older tasks aren't in the loaded set
  useEffect(() => { if (known) { setTask(known); setForm(toForm(known)) } }, [known])

  const set = (fields: Partial<Form>) => setForm((f) => ({ ...f, ...fields }))
  // Existing tasks save field by field; new ones save once on Create.
  const save = async (fields: Partial<Form>) => {
    set(fields)
    if (task && (await run(supabase.from('tasks').update(fields).eq('id', task.id)))) await reload()
  }
  const saveText = (key: 'title' | 'brief_url' | 'ads' | 'description') => () => {
    if (!task) return
    const value = key === 'brief_url' ? (form.brief_url?.trim() || null) : (form[key] ?? '')
    if (key === 'title' && !String(value).trim()) return set({ title: task.title })
    if (value !== task[key]) save({ [key]: value })
  }

  const create = async () => {
    if (!form.client_id || !form.title?.trim()) return toast('Pick a client and give the task a title.')
    const { data, error } = await supabase.from('tasks').insert({ ...form, title: form.title.trim() }).select().single()
    if (error) { console.error(error); return toast("That didn't save. Check your connection and try again.") }
    await reload()
    open(data.ref)
  }

  const { clientName, person } = useLookups()
  const steps = checklist(form.description ?? '')
  const [editNotes, setEditNotes] = useState(isNew)
  const plans = usePlans(form.client_id)

  return (
    <dialog ref={dlg} onClose={close} aria-labelledby="task-title"
      onClick={(e) => e.target === dlg.current && dlg.current.close()}
      className="m-0 h-dvh max-h-dvh w-screen max-w-none bg-board p-0 sm:m-auto sm:h-auto sm:max-h-[92dvh] sm:w-[min(1080px,calc(100vw-32px))] sm:border sm:border-rule">
      <div className="grid min-h-full lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 p-5 lg:p-6">
          <header className="flex flex-wrap items-center gap-3">
            {task && <StatusMark status={task.status} size={22} />}
            <span id="task-title" className="display text-xl">{task ? ref(task.ref) : 'New task'}</span>
            {task && (
              <select aria-label="Status" className="field ml-auto w-auto" value={form.status} onChange={(e) => save({ status: e.target.value })}>
                {STATUSES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            )}
            <button className={`btn btn-quiet ${task ? '' : 'ml-auto'}`} onClick={() => dlg.current?.close()} aria-label="Close"><Close /></button>
          </header>

          <label className="label mt-4" htmlFor="t-title">Task</label>
          <input id="t-title" className="field text-m font-semibold" value={form.title ?? ''} maxLength={300} required autoFocus={isNew}
            placeholder="What needs doing, in a few words" onChange={(e) => set({ title: e.target.value })} onBlur={saveText('title')} />

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Client">
              <select className="field" value={form.client_id} onChange={(e) => (task ? save({ client_id: e.target.value }) : set({ client_id: e.target.value, plan_id: null }))}>
                <option value="" disabled>Choose…</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Type">
              <select className="field" value={form.type} onChange={(e) => {
                const type = e.target.value as TaskType
                const blank = !form.description?.trim() || form.description === TEMPLATES[form.type as TaskType]
                const fields = { type, ...(blank ? { description: TEMPLATES[type] ?? '' } : {}) }
                if (task) save(fields); else set(fields)
              }}>
                {TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
            <Field label="Priority">
              <select className="field" value={form.priority} onChange={(e) => (task ? save({ priority: e.target.value }) : set({ priority: e.target.value }))}>
                {PRIORITIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </Field>
            <Field label="Assignee">
              <select className="field" value={form.assignee_id ?? ''} onChange={(e) => { const v = e.target.value || null; if (task) save({ assignee_id: v }); else set({ assignee_id: v }) }}>
                <option value="">Nobody yet</option>
                {profiles.filter((p) => p.role).map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </Field>
            <Field label="Due">
              <input type="date" className="field num" value={form.due_date ?? ''} onChange={(e) => { const v = e.target.value || null; if (task) save({ due_date: v }); else set({ due_date: v }) }} />
            </Field>
            <Field label="Monthly plan">
              <select className="field" value={form.plan_id ?? ''} onChange={(e) => { const v = e.target.value || null; if (task) save({ plan_id: v }); else set({ plan_id: v }) }}>
                <option value="">Not in a plan</option>
                {plans.map((p) => <option key={p.id} value={p.id}>{monthName(p.month)}</option>)}
              </select>
            </Field>
            <Field label="Brief or link" wide>
              <div className="flex gap-2">
                <input type="url" className="field" placeholder="https://" value={form.brief_url ?? ''} maxLength={1000}
                  onChange={(e) => set({ brief_url: e.target.value })} onBlur={saveText('brief_url')} />
                {form.brief_url && /^https?:\/\//.test(form.brief_url) && (
                  <a className="btn" href={form.brief_url} target="_blank" rel="noreferrer" aria-label="Open link"><External /></a>
                )}
              </div>
            </Field>
          </div>
          <label className="mt-3 flex items-center gap-2">
            <input type="checkbox" className="size-4 accent-[var(--teal)]" checked={!!form.from_client}
              onChange={(e) => (task ? save({ from_client: e.target.checked }) : set({ from_client: e.target.checked }))} />
            Requested by the client
          </label>

          <div className="mt-6 flex items-center justify-between gap-2 border-b-2 border-ink pb-1.5">
            <h3 className="display text-m tracking-[0.06em]">Steps{steps.length > 0 && <span className="meta num ml-2 font-sans normal-case tracking-normal">{steps.filter((s) => s.done).length}/{steps.length}</span>}</h3>
            <button className="btn btn-quiet" onClick={() => { if (editNotes) saveText('description')(); setEditNotes(!editNotes) }}>{editNotes ? 'Done editing' : 'Edit notes'}</button>
          </div>
          {editNotes ? (
            <textarea className="field mt-2 min-h-48" value={form.description ?? ''} maxLength={20000} onBlur={saveText('description')}
              onChange={(e) => set({ description: e.target.value })} aria-label="Notes and steps"
              placeholder={'Notes, briefs, decisions.\nSteps are lines like:\n- [ ] Build from the brief'} />
          ) : (
            <div className="mt-1">
              {steps.length === 0 && !form.description?.trim() && <p className="meta py-2">No steps. Edit notes to add some.</p>}
              {steps.map((s) => (
                <label key={s.line} className="flex items-start gap-3 border-b border-rule py-2">
                  <input type="checkbox" className="mt-0.5 size-4 shrink-0 accent-[var(--teal)]" checked={s.done}
                    onChange={() => { const d = toggle(form.description ?? '', s.line); if (task) save({ description: d }); else set({ description: d }) }} />
                  <span className={s.done ? 'text-mid line-through' : ''}>{s.text}</span>
                </label>
              ))}
              {(form.description ?? '').split('\n').filter((l) => l.trim() && !/^\s*[-*] \[[ xX]\] /.test(l)).length > 0 && (
                <p className="mt-3 whitespace-pre-wrap text-mid">{(form.description ?? '').split('\n').filter((l) => !/^\s*[-*] \[[ xX]\] /.test(l)).join('\n').trim()}</p>
              )}
            </div>
          )}

          <label className="label mt-6" htmlFor="t-ads">Ads (one per line: ad name | ad ID)</label>
          <textarea id="t-ads" className="field num min-h-24" value={form.ads ?? ''} maxLength={10000} onChange={(e) => set({ ads: e.target.value })} onBlur={saveText('ads')}
            placeholder={'Prospecting - Spring Sale - Oct26 - Static | 120200000000000001'} />

          <footer className="sticky bottom-0 -mx-5 mt-6 flex flex-wrap items-center gap-2 border-t border-rule bg-board px-5 py-3 lg:-mx-6 lg:px-6">
            {isNew ? (
              <><button className="btn btn-ink" onClick={create}>Create task</button><button className="btn" onClick={() => dlg.current?.close()}>Cancel</button></>
            ) : task && (
              <>
                <Primary task={task} onSendBack={() => open(task.ref, { sendback: '1' })} />
                <button className="btn" onClick={() => copyText(slackTask({ ...task, client: clientName(task.client_id) }, taskUrl(task.ref)), 'Copied for Slack')}><Copy size={16} />Copy for Slack</button>
                <DeleteTask task={task} onDone={() => dlg.current?.close()} />
              </>
            )}
          </footer>
        </div>

        {task && (
          <aside className="min-w-0 border-t border-rule bg-ground p-5 lg:border-l lg:border-t-0 lg:p-6">
            {params.get('sendback') === '1' && task.status === 'review' && <SendBackForm task={task} onDone={() => open(task.ref)} />}
            <TimePanel task={task} />
            <Comments task={task} person={person} />
          </aside>
        )}
      </div>
    </dialog>
  )
}

function Field({ label, wide, children }: { label: string; wide?: boolean; children: ReactNode }) {
  return <div className={wide ? 'col-span-2' : ''}><span className="label">{label}</span>{children}</div>
}

function usePlans(clientId: string) {
  const [plans, setPlans] = useState<Tables<'plans'>[]>([])
  useEffect(() => {
    if (!clientId) return setPlans([])
    supabase.from('plans').select('*').eq('client_id', clientId).order('month', { ascending: false }).limit(12).then(({ data }) => setPlans(data ?? []))
  }, [clientId])
  return plans
}

// The next move for this task, as one obvious button.
function Primary({ task, onSendBack }: { task: Task; onSendBack: () => void }) {
  const { reload } = useData()
  const [raised, setRaised] = useState(false)
  const move = async (status: string, done: string) => { if (await run(supabase.from('tasks').update({ status }).eq('id', task.id), done)) reload() }
  if (task.status === 'review')
    return (
      <>
        <button className="btn btn-ink" disabled={raised} onClick={async () => {
          setRaised(true)
          if (await run(supabase.from('tasks').update({ status: 'approved' }).eq('id', task.id), 'Approved. Flag is up.')) { await new Promise((r) => setTimeout(r, 260)); reload() } else setRaised(false)
        }}><Flag raised={raised} />Approve</button>
        <button className="btn" onClick={onSendBack}>Send back</button>
      </>
    )
  if (task.status === 'approved') return <button className="btn btn-ink" onClick={() => move('done', 'Marked done')}>Mark done</button>
  if (task.status === 'done') return <button className="btn" onClick={() => move('in_progress', 'Reopened')}>Reopen</button>
  return <button className="btn btn-ink" onClick={() => move('review', 'Sent for review')}><Flag raised={false} />Send for review</button>
}

function SendBackForm({ task, onDone }: { task: Task; onDone: () => void }) {
  const { reload } = useData()
  const [note, setNote] = useState('')
  return (
    <form className="mb-6 border-2 border-ink bg-board p-3" onSubmit={async (e) => {
      e.preventDefault()
      if (!note.trim()) return
      const ok = (await run(supabase.from('comments').insert({ task_id: task.id, body: note.trim() }))) &&
        (await run(supabase.from('tasks').update({ status: 'in_progress' }).eq('id', task.id), 'Sent back with your note'))
      if (ok) { await reload(); onDone() }
    }}>
      <label className="display text-m tracking-[0.06em]" htmlFor="sendback">What needs to change?</label>
      <textarea id="sendback" className="field mt-2 min-h-24" autoFocus required maxLength={5000} value={note} onChange={(e) => setNote(e.target.value)} />
      <button className="btn btn-ink mt-2" disabled={!note.trim()}>Send back</button>
    </form>
  )
}

function DeleteTask({ task, onDone }: { task: Task; onDone: () => void }) {
  const { reload } = useData()
  const [sure, setSure] = useState(false)
  return sure ? (
    <button className="btn btn-danger ml-auto" onClick={async () => { if (await run(supabase.from('tasks').delete().eq('id', task.id), `${ref(task.ref)} deleted`)) { onDone(); reload() } }}>
      <Trash size={16} />Yes, delete {ref(task.ref)}
    </button>
  ) : (
    <button className="btn btn-quiet ml-auto" onClick={() => setSure(true)}><Trash size={16} />Delete</button>
  )
}

function TimePanel({ task }: { task: Task }) {
  const { me } = useData()
  const { person } = useLookups()
  const [entries, setEntries] = useState<Entry[]>([])
  const [timer, setTimer] = useState<Tables<'timers'> | null>(null)
  const [h, setH] = useState('')
  const [note, setNote] = useState('')
  const [, tick] = useState(0)

  const load = async () => {
    const [e, t] = await Promise.all([
      supabase.from('time_entries').select('*').eq('task_id', task.id).order('date', { ascending: false }),
      supabase.from('timers').select('*').eq('user_id', me!.id).maybeSingle(),
    ])
    setEntries(e.data ?? [])
    setTimer(t.data)
  }
  useEffect(() => { load() }, [task.id])
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 30_000); return () => clearInterval(id) }, [])

  const log = async (hrs: number, text: string | null, onTask = task) =>
    run(supabase.from('time_entries').insert({ client_id: onTask.client_id, task_id: onTask.id, hours: hrs, note: text, date: today() }))

  // Stop rounds to the nearest quarter hour, never below a quarter.
  const stop = async () => {
    if (!timer) return
    const hrs = Math.max(0.25, Math.round(((Date.now() - new Date(timer.started_at).getTime()) / 36e5) * 4) / 4)
    const { data: t } = await supabase.from('tasks').select('*').eq('id', timer.task_id).single()
    if (t && (await log(hrs, 'Timer', t)) && (await run(supabase.from('timers').delete().eq('user_id', me!.id), `Logged ${hours(hrs)}`))) load()
  }
  const start = async () => { if (await run(supabase.from('timers').insert({ task_id: task.id }))) load() }
  const mins = timer ? Math.floor((Date.now() - new Date(timer.started_at).getTime()) / 6e4) : 0
  const total = entries.reduce((s, e) => s + Number(e.hours), 0)

  return (
    <section>
      <h3 className="h-sec mt-0"><span>Time</span><span className="count num">{hours(total)} logged</span></h3>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {timer?.task_id === task.id ? (
          <button className="btn btn-ink" onClick={stop}><Stop size={14} />Stop · {Math.floor(mins / 60)}h {mins % 60}m</button>
        ) : timer ? (
          <button className="btn" onClick={async () => { await stop(); await start() }}><Timer size={16} />Stop the other timer and start here</button>
        ) : (
          <button className="btn" onClick={start}><Timer size={16} />Start timer</button>
        )}
      </div>
      <form className="mt-3 grid grid-cols-[84px_1fr_auto] gap-2" onSubmit={async (e) => {
        e.preventDefault()
        const hrs = Number(h)
        if (!(hrs > 0 && hrs <= 24)) return toast('Hours must be between 0.25 and 24.')
        if (await log(hrs, note.trim() || null)) { setH(''); setNote(''); toast(`Logged ${hours(hrs)}`); load() }
      }}>
        <input aria-label="Hours" className="field num" type="number" step="0.25" min="0.25" max="24" placeholder="Hours" value={h} onChange={(e) => setH(e.target.value)} />
        <input aria-label="Note" className="field" placeholder="Note (optional)" maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
        <button className="btn">Log</button>
      </form>
      <ul className="mt-2">
        {entries.map((e) => (
          <li key={e.id} className="grid grid-cols-[52px_1fr_auto] gap-2 border-b border-rule py-1.5">
            <span className="meta num">{shortDate(e.date)}</span>
            <span className="min-w-0 truncate">{person(e.user_id)}{e.note && <span className="meta"> · {e.note}</span>}</span>
            <span className="num font-semibold">{hours(Number(e.hours))}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function Comments({ task, person }: { task: Task; person: (id: string | null) => string }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [events, setEvents] = useState<TaskEvent[]>([])
  const [body, setBody] = useState('')
  const load = async () => {
    const [c, e] = await Promise.all([
      supabase.from('comments').select('*').eq('task_id', task.id).order('created_at'),
      supabase.from('task_events').select('*').eq('task_id', task.id).order('created_at'),
    ])
    setComments(c.data ?? [])
    setEvents(e.data ?? [])
  }
  useEffect(() => { load() }, [task.id, task.status])

  // Comments and status moves in one timeline: the sign-off record reads top to bottom.
  const items = [
    ...comments.map((c) => ({ at: c.created_at, key: c.id, node: <p className="whitespace-pre-wrap">{c.body}</p>, who: person(c.author_id) })),
    ...events.map((e) => ({
      at: e.created_at, key: `e${e.id}`, who: person(e.actor_id) || 'Scheduled',
      node: <p className="flex items-center gap-2 text-mid"><StatusMark status={e.to_status} size={16} />{e.from_status ? `moved it to ${statusLabel(e.to_status)}` : 'created it'}</p>,
    })),
  ].sort((a, b) => a.at.localeCompare(b.at))

  return (
    <section>
      <h3 className="h-sec"><span>Notes and history</span></h3>
      <ol className="mt-1">
        {items.map((i) => (
          <li key={i.key} className="border-b border-rule py-2">
            <p className="meta"><span className="font-semibold text-ink">{i.who}</span> · {stamp(i.at)}</p>
            {i.node}
          </li>
        ))}
      </ol>
      <form className="mt-3" onSubmit={async (e) => {
        e.preventDefault()
        if (body.trim() && (await run(supabase.from('comments').insert({ task_id: task.id, body: body.trim() })))) { setBody(''); load() }
      }}>
        <label className="label" htmlFor="t-comment">Add a note</label>
        <textarea id="t-comment" className="field min-h-20" maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit() }} />
        <button className="btn mt-2" disabled={!body.trim()}>Post note</button>
      </form>
    </section>
  )
}
