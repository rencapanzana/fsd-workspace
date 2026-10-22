import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { run, useData, useLookups, useScope, useTaskLink, type Task } from '../lib/data'
import { checklist } from '../lib/checklist'
import { addDays, shortDate, today } from '../lib/format'
import { PRIORITIES, ref, STATUSES, TYPES } from '../lib/model'
import { Avatar, overdue, StatusMark } from '../components/bits'
import { Hazard, Plus } from '../components/Icons'

// Copy colours on the docket edge: canary waiting for initials, pink on hold, blue in progress.
const STRIP: Record<string, string> = {
  todo: 'border-t-rule', in_progress: 'border-t-blue', review: 'border-t-canary', approved: 'border-t-red', on_hold: 'border-t-pink', done: 'border-t-rule',
}
const RANK: Record<string, number> = { urgent: 0, high: 1, normal: 2, low: 3 }
// Within a column: priority first, then the nearest due date.
const order = (a: Task, b: Task) => RANK[a.priority] - RANK[b.priority] || (a.due_date ?? '9999').localeCompare(b.due_date ?? '9999') || b.ref - a.ref

export function Board() {
  const { tasks, profiles, reload } = useData()
  const { client, has } = useScope()
  const { open } = useTaskLink()
  const [type, setType] = useState('')
  const [who, setWho] = useState('')
  const [prio, setPrio] = useState('')
  const [over, setOver] = useState<string | null>(null)
  const doneSince = addDays(today(), -14)

  const shown = tasks.filter((t) =>
    has(t.client_id) && (!type || t.type === type) && (!who || t.assignee_id === who) && (!prio || t.priority === prio) &&
    (t.status !== 'done' || (t.completed_at ?? '') >= doneSince))

  // Moving out of Review back into the work means sending it back, which needs a note: the dialog asks for it.
  const drop = async (status: string, id: string) => {
    setOver(null)
    const t = tasks.find((x) => x.id === id)
    if (!t || t.status === status) return
    if (t.status === 'review' && (status === 'todo' || status === 'in_progress')) return open(t.ref, { sendback: '1' })
    if (await run(supabase.from('tasks').update({ status }).eq('id', id))) reload()
  }

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-xl">{client ? `${client.name} board` : 'Board'}</h1>
          <p className="meta mt-1">Drag a card to move it, or open it to change its status.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Filter label="Type" value={type} set={setType} options={TYPES} />
          <Filter label="Assignee" value={who} set={setWho} options={profiles.filter((p) => p.role).map((p) => [p.id, p.full_name] as const)} />
          <Filter label="Priority" value={prio} set={setPrio} options={PRIORITIES} />
        </div>
      </header>

      <div className="-mx-4 mt-5 flex snap-x gap-3 overflow-x-auto px-4 pb-4 lg:-mx-8 lg:px-8">
        {STATUSES.map(([status, label]) => {
          const col = shown.filter((t) => t.status === status).sort(order)
          return (
            <section key={status} aria-label={label}
              onDragOver={(e) => { e.preventDefault(); setOver(status) }}
              onDragLeave={() => setOver((s) => (s === status ? null : s))}
              onDrop={(e) => drop(status, e.dataTransfer.getData('text/plain'))}
              className={`w-[272px] shrink-0 snap-start ${over === status ? 'bg-board outline-2 outline-dashed outline-ink' : ''}`}>
              <header className="h-sec mt-0">
                <h2 className="flex items-center gap-2"><StatusMark status={status} />{label}</h2>
                <span className="count num">{col.length}</span>
              </header>
              <div className="mt-2 space-y-2">
                {col.map((t) => <Card key={t.id} task={t} />)}
                {status === 'todo' && (
                  <button className="btn btn-quiet w-full justify-start text-mid" onClick={() => open('new', client ? { client: client.slug } : {})}><Plus />Add a task</button>
                )}
                {status === 'done' && col.length > 0 && <p className="meta px-1">Showing the last 14 days.</p>}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}

function Card({ task }: { task: Task }) {
  const { open } = useTaskLink()
  const { clientName, person } = useLookups()
  const steps = checklist(task.description)
  const done = steps.filter((s) => s.done).length
  const next = steps.find((s) => !s.done)
  const late = overdue(task)
  return (
    <article draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', task.id); e.dataTransfer.effectAllowed = 'move' }}
      className={`group panel cursor-grab border-t-4 p-3 hover:border-ink active:cursor-grabbing ${STRIP[task.status]}`}>
      <button onClick={() => open(task.ref)} className="block w-full text-left focus-visible:outline-offset-4">
        <span className="flex items-center justify-between gap-2">
          <span className="ref">{ref(task.ref)}</span>
          {task.due_date && (
            <span className={`flex items-center gap-1 text-s num ${late ? 'font-semibold text-red' : 'text-mid'}`}>
              {late && <Hazard size={14} aria-label="Overdue" />}{shortDate(task.due_date)}
            </span>
          )}
        </span>
        <span className="mt-1 block truncate text-s font-semibold">{clientName(task.client_id)}</span>
        <span className="mt-0.5 line-clamp-3 block">{task.title}</span>
        {/* Focus or hover reveals the next step inline; nothing else moves. */}
        {next && <span className="meta mt-1 hidden line-clamp-2 group-focus-within:block group-hover:block">Next: {next.text}</span>}
        <span className="mt-2 flex items-center gap-2 text-s text-mid">
          <span>{TYPES.find(([k]) => k === task.type)?.[1]}</span>
          {task.priority !== 'normal' && <span className={task.priority === 'urgent' ? 'font-semibold text-red' : ''}>{PRIORITIES.find(([k]) => k === task.priority)?.[1]}</span>}
          {steps.length > 0 && <span className="num">{done}/{steps.length}</span>}
          <span className="ml-auto"><Avatar name={person(task.assignee_id)} /></span>
        </span>
        {steps.length > 0 && (
          <span className="mt-2 block h-[3px] bg-rule"><span className="block h-[3px] bg-ink" style={{ width: `${(done / steps.length) * 100}%` }} /></span>
        )}
      </button>
    </article>
  )
}

function Filter({ label, value, set, options }: { label: string; value: string; set: (v: string) => void; options: readonly (readonly [string, string])[] }) {
  return (
    <label className="flex items-center gap-2">
      <span className="meta">{label}</span>
      <select className="field w-auto" value={value} onChange={(e) => set(e.target.value)}>
        <option value="">All</option>
        {options.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
      </select>
    </label>
  )
}
