import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { run, taskUrl, useData, useLookups, useTaskLink, type Task } from '../lib/data'
import type { Tables } from '../lib/database.types'
import { addDays, longDate, today } from '../lib/format'
import { slackSummary } from '../lib/slack'
import { copyText, Empty, overdue, Section, TaskRow } from '../components/bits'
import { Conditions } from '../components/Conditions'
import { Copy, Flag, Hazard } from '../components/Icons'

export function Today() {
  const { tasks, me } = useData()
  const { clientName } = useLookups()
  const [mine, setMine] = useState(() => { try { return localStorage.getItem('fsd-today-mine') === '1' } catch { return false } })
  const [sentBack, setSentBack] = useState<{ task: Task; note: string }[]>([])
  const [coming, setComing] = useState<Tables<'recurring'>[]>([])
  const t = today()

  const visible = tasks.filter((x) => !mine || x.assignee_id === me!.id)
  const review = visible.filter((x) => x.status === 'review')
  const cleared = visible.filter((x) => x.status === 'approved')
  const late = visible.filter((x) => overdue(x) && !['review', 'approved'].includes(x.status))
  const week = visible.filter((x) => x.due_date && x.due_date >= t && x.due_date <= addDays(t, 7) && ['todo', 'in_progress'].includes(x.status))
  const hold = visible.filter((x) => x.status === 'on_hold')

  // Sent back = open work whose latest move came out of Review. The note is the comment left with it.
  useEffect(() => {
    const open = visible.filter((x) => ['todo', 'in_progress'].includes(x.status))
    if (open.length === 0) return setSentBack([])
    supabase.from('task_events').select('task_id, from_status').in('task_id', open.map((x) => x.id)).order('created_at', { ascending: false })
      .then(async ({ data, error }) => {
        if (error) return console.error(error)
        const latest = new Map<string, string | null>()
        for (const e of data) if (!latest.has(e.task_id)) latest.set(e.task_id, e.from_status)
        const back = open.filter((x) => latest.get(x.id) === 'review')
        if (back.length === 0) return setSentBack([])
        const { data: notes } = await supabase.from('comments').select('task_id, body').in('task_id', back.map((x) => x.id)).order('created_at', { ascending: false })
        setSentBack(back.map((task) => ({ task, note: notes?.find((n) => n.task_id === task.id)?.body ?? '' })))
      })
  }, [tasks, mine])

  useEffect(() => {
    supabase.from('recurring').select('*').eq('active', true).lte('next_due', addDays(t, 14)).order('next_due')
      .then(({ data }) => setComing(data ?? []))
  }, [t])

  const toggleMine = () => {
    setMine(!mine)
    try { localStorage.setItem('fsd-today-mine', mine ? '0' : '1') } catch { /* fine */ }
  }
  const summary = () =>
    copyText(slackSummary('Waiting for your sign-off:', review.map((x) => ({ ...x, client: clientName(x.client_id) })), taskUrl), 'Review summary copied for Slack')

  return (
    <div className="grid gap-x-10 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="display text-xl">Today</h1>
            <p className="meta mt-1">
              {review.length} waiting for sign-off · {late.length} overdue · {week.length} due this week
            </p>
          </div>
          <div className="flex gap-2" role="group" aria-label="Whose work">
            <button className="btn" aria-pressed={!mine} onClick={() => mine && toggleMine()}>Everyone</button>
            <button className="btn" aria-pressed={mine} onClick={() => !mine && toggleMine()}>Mine</button>
          </div>
        </header>

        <Section title="Waiting for the flags" count={review.length} icon={<Flag raised={false} />}
          action={review.length > 0 && <button className="btn btn-quiet ml-2" onClick={summary}><Copy size={16} />Copy for Slack</button>}>
          {review.length === 0 ? <Empty>Nothing is waiting for sign-off.</Empty> : review.map((x) => (
            <TaskRow key={x.id} task={x}><Approve task={x} /><SendBack task={x} /></TaskRow>
          ))}
        </Section>

        {sentBack.length > 0 && (
          <Section title="Sent back" count={sentBack.length}>
            {sentBack.map(({ task, note }) => (
              <div key={task.id}>
                <TaskRow task={task} />
                {note && <p className="border-b border-rule py-2 pl-[34px] text-mid">“{note}”</p>}
              </div>
            ))}
          </Section>
        )}

        <Section title="Cleared to action" count={cleared.length} icon={<Flag />}>
          {cleared.length === 0 ? <Empty>No approved work waiting to go live.</Empty> : cleared.map((x) => (
            <TaskRow key={x.id} task={x}><MarkDone task={x} /></TaskRow>
          ))}
        </Section>

        <Section title="Overdue" count={late.length} icon={late.length > 0 ? <Hazard /> : undefined}>
          {late.length === 0 ? <Empty>Nothing overdue.</Empty> : late.map((x) => <TaskRow key={x.id} task={x} />)}
        </Section>

        <Section title="This week" count={week.length}>
          {week.length === 0 ? <Empty>Nothing else due in the next 7 days.</Empty> : week.map((x) => <TaskRow key={x.id} task={x} />)}
        </Section>

        {hold.length > 0 && (
          <Section title="On hold" count={hold.length}>
            {hold.map((x) => <TaskRow key={x.id} task={x} />)}
          </Section>
        )}

        <Section title="Coming up" count={coming.length}>
          {coming.length === 0 ? <Empty>No recurring reports or reviews in the next two weeks.</Empty> : coming.map((r) => (
            <div key={r.id} className="grid grid-cols-[110px_minmax(0,1fr)] gap-3 border-b border-rule py-2.5 md:grid-cols-[110px_minmax(0,11rem)_minmax(0,1fr)]">
              <span className="num font-semibold">{longDate(r.next_due)}</span>
              <span className="truncate font-semibold">{clientName(r.client_id)}</span>
              <span className="col-start-2 md:col-start-auto">{r.title}<span className="meta block">Task appears {longDate(addDays(r.next_due, -r.lead_days))}</span></span>
            </div>
          ))}
        </Section>
      </div>

      <aside className="min-w-0">
        <Section title="Conditions"><p className="meta pt-2">Yesterday against each account's 60-day average.</p><Conditions /></Section>
      </aside>
    </div>
  )
}

// Approve raises the flag: the cloth climbs the pole, then the row moves to Cleared to action.
export function Approve({ task, label = 'Approve' }: { task: Task; label?: string }) {
  const { reload } = useData()
  const [raised, setRaised] = useState(false)
  return (
    <button className="btn btn-ink" disabled={raised}
      onClick={async () => {
        setRaised(true)
        if (await run(supabase.from('tasks').update({ status: 'approved' }).eq('id', task.id))) {
          await new Promise((r) => setTimeout(r, 260))
          await reload()
        } else setRaised(false)
      }}>
      <Flag raised={raised} />{label}
    </button>
  )
}

export function SendBack({ task }: { task: Task }) {
  const { open } = useTaskLink()
  return <button className="btn" onClick={() => open(task.ref, { sendback: '1' })}>Send back</button>
}

function MarkDone({ task }: { task: Task }) {
  const { reload } = useData()
  return (
    <button className="btn" onClick={async () => { if (await run(supabase.from('tasks').update({ status: 'done' }).eq('id', task.id), 'Marked done')) reload() }}>
      Mark done
    </button>
  )
}
