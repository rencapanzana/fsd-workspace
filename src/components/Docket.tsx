import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { run, useData, useLookups, useTaskLink, type Task } from '../lib/data'
import { initials, shortDate } from '../lib/format'
import { ref, typeLabel } from '../lib/model'
import { overdue } from './bits'

// Who sent each task for sign-off, and who approved it, read from the trigger-written history.
export function useSignoffs(tasks: Task[]) {
  const [map, setMap] = useState(new Map<string, { sent?: string | null; approved?: string | null }>())
  const key = tasks.map((t) => `${t.id}${t.status}`).join()
  useEffect(() => {
    if (!tasks.length) return setMap(new Map())
    supabase.from('task_events').select('task_id, to_status, actor_id').in('task_id', tasks.map((t) => t.id)).in('to_status', ['review', 'approved'])
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const m = new Map<string, { sent?: string | null; approved?: string | null }>()
        for (const e of data ?? []) {
          const v = m.get(e.task_id) ?? {}
          if (e.to_status === 'review' && !('sent' in v)) v.sent = e.actor_id
          if (e.to_status === 'approved' && !('approved' in v)) v.approved = e.actor_id
          m.set(e.task_id, v)
        }
        setMap(m)
      })
  }, [key])
  return map
}

// Built / Sent / Approved initials, as on a paper job docket. The stamp lands once the last box is filled.
export function SignoffBoxes({ built, sent, approved, stamped, pressing }: { built: string; sent: string; approved: string; stamped: boolean; pressing?: boolean }) {
  const box = (label: string, name: string, waiting = false) => (
    <div className={`border-r border-rule px-4 py-2 last:border-r-0 ${waiting ? 'bg-canary-soft' : ''}`}>
      <span className="label-caps">{label}</span>
      <strong className="block h-6 text-l font-bold" title={name}>{name ? initials(name) : ''}</strong>
    </div>
  )
  return (
    <div className="relative grid grid-cols-3 border-t border-rule">
      {box('Built', built)}
      {box('Sent', sent)}
      {box('Approved', approved, !approved)}
      {stamped && <span className={`stamp absolute right-3 top-1/2 -translate-y-1/2 ${pressing ? 'stamp-press' : ''}`}>Approved</span>}
    </div>
  )
}

// A task waiting for sign-off, as a job docket: three initials boxes, and a stamp when the last one is filled.
export function Docket({ task, sent, approved }: { task: Task; sent?: string | null; approved?: string | null }) {
  const { me, reload } = useData()
  const { clientName, person } = useLookups()
  const { open } = useTaskLink()
  const [stamping, setStamping] = useState(false)
  const approver = stamping ? me?.full_name ?? '' : person(approved)
  const ads = task.ads.trim() ? task.ads.trim().split('\n').length : 0

  const approve = async () => {
    setStamping(true)
    if (await run(supabase.from('tasks').update({ status: 'approved' }).eq('id', task.id))) {
      await new Promise((r) => setTimeout(r, 450))
      await reload()
    } else setStamping(false)
  }

  return (
    <article className={`panel relative flex flex-col border-t-8 ${task.status === 'review' ? 'border-t-canary' : 'border-t-board'}`}>
      <header className="flex items-baseline justify-between gap-2 border-b border-dashed border-rule px-4 pb-2 pt-3">
        <button onClick={() => open(task.ref)} className="ref text-l font-extrabold hover:underline">{ref(task.ref)}</button>
        <span className="label-caps text-right">{typeLabel(task.type)}{ads > 0 && ` · ${ads} ${ads === 1 ? 'ad' : 'ads'}`}</span>
      </header>
      <button onClick={() => open(task.ref)} className="flex-1 px-4 pb-4 pt-2.5 text-left">
        <span className="block text-s font-semibold text-mid">{clientName(task.client_id)}</span>
        <span className="mt-0.5 block font-medium">{task.title}</span>
        {task.due_date && <span className={`meta mt-1 block ${overdue(task) ? 'font-semibold text-red' : ''}`}>Due {shortDate(task.due_date)}</span>}
      </button>
      <SignoffBoxes built={person(task.assignee_id)} sent={person(sent)} approved={approver} stamped={stamping || task.status === 'approved'} pressing={stamping} />
      {task.status === 'review' && (
        <div className="flex gap-2 border-t border-rule px-4 py-2.5">
          <button className="btn btn-ink" onClick={approve} disabled={stamping}>Approve</button>
          <button className="btn" onClick={() => open(task.ref, { sendback: '1' })} disabled={stamping}>Send back</button>
        </div>
      )}
    </article>
  )
}
