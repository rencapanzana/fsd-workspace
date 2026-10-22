import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { checklist } from '../lib/checklist'
import { useLookups, useTaskLink, type Task } from '../lib/data'
import { initials, shortDate, today } from '../lib/format'
import { ref, statusLabel, typeLabel } from '../lib/model'
import { Box, Check, HalfRing, Hazard, Pause, Ring, Stamped } from './Icons'

export function StatusMark({ status, size = 18 }: { status: string; size?: number }) {
  const label = statusLabel(status)
  const mark =
    status === 'review' ? <Box size={size} /> :
    status === 'approved' ? <Stamped size={size} /> :
    status === 'in_progress' ? <HalfRing size={size} /> :
    status === 'on_hold' ? <Pause size={size} /> :
    status === 'done' ? <Check size={size} /> : <Ring size={size} />
  return <span className="inline-flex shrink-0 text-ink" title={label} role="img" aria-label={label}>{mark}</span>
}

export const overdue = (t: Task) => !!t.due_date && t.due_date < today() && t.status !== 'done'

// A section is a tracked-caps label over its content. `panel` puts list rows on a white docket sheet.
export function Section({ title, count, icon, children, action, panel }: { title: string; count?: number; icon?: ReactNode; children: ReactNode; action?: ReactNode; panel?: boolean }) {
  return (
    <section>
      <header className="h-sec">
        <h2 className="flex items-center gap-2">{icon}{title}</h2>
        {action && <div className="normal-case tracking-normal">{action}</div>}
        {count != null && <span className="count">{count}</span>}
      </header>
      {panel ? <div className="panel">{children}</div> : children}
    </section>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="meta px-4 py-3">{children}</p>
}

export function Avatar({ name }: { name: string }) {
  return name ? (
    <span title={name} className="inline-grid size-6 shrink-0 place-items-center border border-rule text-s font-semibold">{initials(name)}</span>
  ) : null
}

// One task as a row on a panel: FSD ref, client, what it is, and the due date on the right.
export function TaskRow({ task, children, showClient = true, showStatus = false }: { task: Task; children?: ReactNode; showClient?: boolean; showStatus?: boolean }) {
  const { open } = useTaskLink()
  const { clientName, person } = useLookups()
  const steps = checklist(task.description)
  const late = overdue(task)
  return (
    <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-rule px-4 py-2.5 last:border-b-0 md:grid-cols-[64px_minmax(0,12rem)_minmax(0,1fr)_auto] md:items-center">
      <span className="ref">{ref(task.ref)}</span>
      <span className="truncate">{showClient ? clientName(task.client_id) : typeLabel(task.type)}</span>
      <button onClick={() => open(task.ref)} className="col-start-2 min-w-0 text-left md:col-start-auto">
        <span className="line-clamp-2 hover:underline">{task.title}</span>
        <span className="meta flex flex-wrap gap-x-3">
          {showClient && <span>{typeLabel(task.type)}</span>}
          {steps.length > 0 && <span className="num">{steps.filter((s) => s.done).length}/{steps.length} steps</span>}
          {task.ads.trim() && <span className="num">{task.ads.trim().split('\n').length} ads</span>}
          {task.assignee_id && <span>{person(task.assignee_id)}</span>}
        </span>
      </button>
      <div className="col-start-2 flex flex-wrap items-center gap-2 md:col-start-auto md:justify-end">
        {showStatus && <span className="flex items-center gap-1.5 text-s text-mid"><StatusMark status={task.status} size={14} />{statusLabel(task.status)}</span>}
        {task.status === 'approved' && <span className="stamp">Approved</span>}
        {task.due_date && (
          <span className={`flex items-center gap-1 num ${late ? 'font-semibold text-red' : 'text-mid'}`}>
            {late && <Hazard size={14} aria-label="Overdue" />}{shortDate(task.due_date)}
          </span>
        )}
        {children}
      </div>
    </div>
  )
}

export function ClientLink({ id }: { id: string }) {
  const { client } = useLookups()
  const c = client(id)
  return c ? <Link to={`/c/${c.slug}`} className="font-semibold hover:underline">{c.name}</Link> : null
}

export function Toasts() {
  const [items, setItems] = useState<{ id: number; text: string }[]>([])
  useEffect(() => {
    const on = (e: Event) => {
      const id = Date.now() + Math.random()
      setItems((xs) => [...xs, { id, text: (e as CustomEvent<string>).detail }])
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 4000)
    }
    window.addEventListener('fsd-toast', on)
    return () => window.removeEventListener('fsd-toast', on)
  }, [])
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <p key={t.id} className="pointer-events-auto bg-ink px-4 py-2 font-semibold text-board">{t.text}</p>
      ))}
    </div>
  )
}

export async function copyText(text: string, done = 'Copied') {
  try {
    await navigator.clipboard.writeText(text)
    window.dispatchEvent(new CustomEvent('fsd-toast', { detail: done }))
  } catch {
    window.dispatchEvent(new CustomEvent('fsd-toast', { detail: "Couldn't copy. Select the text and copy it instead." }))
  }
}
