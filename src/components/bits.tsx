import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { checklist } from '../lib/checklist'
import { useLookups, useTaskLink, type Task } from '../lib/data'
import { initials, shortDate, today } from '../lib/format'
import { ref, statusLabel, typeLabel } from '../lib/model'
import { Check, Flag, HalfRing, Hazard, Pause, Ring } from './Icons'

export function StatusMark({ status, size = 18 }: { status: string; size?: number }) {
  const label = statusLabel(status)
  const mark =
    status === 'review' ? <Flag raised={false} size={size} /> :
    status === 'approved' ? <Flag size={size} /> :
    status === 'in_progress' ? <HalfRing size={size} /> :
    status === 'on_hold' ? <Pause size={size} /> :
    status === 'done' ? <Check size={size} /> : <Ring size={size} />
  return <span className="inline-flex shrink-0 text-ink" title={label} role="img" aria-label={label}>{mark}</span>
}

export const overdue = (t: Task) => !!t.due_date && t.due_date < today() && t.status !== 'done'

export function Section({ title, count, icon, children, action }: { title: string; count?: number; icon?: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <section>
      <header className="h-sec">
        <h2 className="flex items-center gap-2">{icon}{title}</h2>
        {action && <div className="font-sans normal-case tracking-normal">{action}</div>}
        {count != null && <span className="count num">{count}</span>}
      </header>
      {children}
    </section>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="meta py-3">{children}</p>
}

export function Avatar({ name }: { name: string }) {
  return name ? (
    <span title={name} className="inline-grid size-6 shrink-0 place-items-center rounded-full border border-rule text-s font-semibold">{initials(name)}</span>
  ) : null
}

// One task as a row: mark, FSD ref, client, title, then whatever the context adds on the right.
export function TaskRow({ task, children, showClient = true }: { task: Task; children?: ReactNode; showClient?: boolean }) {
  const { open } = useTaskLink()
  const { clientName, person } = useLookups()
  const steps = checklist(task.description)
  const late = overdue(task)
  // Phone: mark beside a stacked block. Desktop: the wrapper dissolves (md:contents) into table-like columns.
  return (
    <div className="grid grid-cols-[22px_minmax(0,1fr)] gap-x-3 gap-y-1 border-b border-rule py-2.5 md:grid-cols-[22px_64px_minmax(0,11rem)_minmax(0,1fr)_auto] md:items-center">
      <span className="row-span-3 pt-0.5 md:row-span-1 md:pt-0">{late ? <Hazard aria-label="Overdue" /> : <StatusMark status={task.status} />}</span>
      <div className="flex min-w-0 gap-2 md:contents">
        <span className="ref">{ref(task.ref)}</span>
        <span className="truncate font-semibold">{showClient ? clientName(task.client_id) : ''}</span>
      </div>
      <button onClick={() => open(task.ref)} className="min-w-0 text-left">
        <span className="line-clamp-2 hover:underline">{task.title}</span>
        <span className="meta flex flex-wrap gap-x-3">
          <span>{typeLabel(task.type)}</span>
          {steps.length > 0 && <span className="num">{steps.filter((s) => s.done).length}/{steps.length} steps</span>}
          {task.ads.trim() && <span className="num">{task.ads.trim().split('\n').length} ads</span>}
          {task.due_date && <span className={late ? 'font-semibold text-red' : ''}>Due {shortDate(task.due_date)}</span>}
          {task.assignee_id && <span>{person(task.assignee_id)}</span>}
        </span>
      </button>
      {children && <div className="flex flex-wrap gap-2 md:justify-end">{children}</div>}
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
        <p key={t.id} className="pointer-events-auto rounded-sm bg-ink px-4 py-2 font-semibold text-board">{t.text}</p>
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
