import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { run, taskUrl, useData, useLookups, type Task } from '../lib/data'
import type { Tables } from '../lib/database.types'
import { addDays, longDate, today } from '../lib/format'
import { slackSummary } from '../lib/slack'
import { copyText, Empty, overdue, Section, TaskRow } from '../components/bits'
import { Conditions } from '../components/Conditions'
import { Docket, useSignoffs } from '../components/Docket'
import { Copy } from '../components/Icons'

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
  const signoffs = useSignoffs(review)

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

  const toggleMine = (next: boolean) => {
    setMine(next)
    try { localStorage.setItem('fsd-today-mine', next ? '1' : '0') } catch { /* fine */ }
  }
  const summary = () =>
    copyText(slackSummary('Waiting for your sign-off:', review.map((x) => ({ ...x, client: clientName(x.client_id) })), taskUrl), 'Copied for Slack')

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="display text-xl">Traffic sheet</h1>
          <p className="mt-1 text-mid">
            {review.length} waiting for Jeremy's initials · {late.length} overdue · {week.length} due this week
          </p>
        </div>
        <div className="flex gap-2" role="group" aria-label="Whose work">
          <button className={`btn ${!mine ? 'btn-ink' : ''}`} aria-pressed={!mine} onClick={() => toggleMine(false)}>Everyone</button>
          <button className={`btn ${mine ? 'btn-ink' : ''}`} aria-pressed={mine} onClick={() => toggleMine(true)}>Mine</button>
        </div>
      </header>

      <Section title="Waiting for sign-off" count={review.length}
        action={review.length > 0 && <button className="btn btn-quiet -my-2" onClick={summary}><Copy size={16} />Copy for Slack</button>}>
        {review.length === 0 ? (
          <div className="panel"><Empty>Nothing is waiting for sign-off.</Empty></div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {review.map((x) => <Docket key={x.id} task={x} sent={signoffs.get(x.id)?.sent} />)}
          </div>
        )}
      </Section>

      <div className="grid gap-x-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          {sentBack.length > 0 && (
            <Section title="Sent back" count={sentBack.length} panel>
              {sentBack.map(({ task, note }) => (
                <div key={task.id} className="border-b border-rule last:border-b-0">
                  <TaskRow task={task} />
                  {note && <p className="-mt-1 px-4 pb-3 md:pl-[92px] text-mid">“{note}”</p>}
                </div>
              ))}
            </Section>
          )}

          <Section title="Approved, ready to go live" count={cleared.length} panel>
            {cleared.length === 0 ? <Empty>No approved work waiting to go live.</Empty> : cleared.map((x) => (
              <TaskRow key={x.id} task={x}><MarkDone task={x} /></TaskRow>
            ))}
          </Section>

          <Section title="Overdue" count={late.length} panel>
            {late.length === 0 ? <Empty>Nothing overdue.</Empty> : late.map((x) => <TaskRow key={x.id} task={x} />)}
          </Section>

          <Section title="This week" count={week.length} panel>
            {week.length === 0 ? <Empty>Nothing else due in the next 7 days.</Empty> : week.map((x) => <TaskRow key={x.id} task={x} />)}
          </Section>

          {hold.length > 0 && (
            <Section title="On hold" count={hold.length} panel>
              {hold.map((x) => <TaskRow key={x.id} task={x} />)}
            </Section>
          )}

          <Section title="Coming up" count={coming.length} panel>
            {coming.length === 0 ? <Empty>No recurring reports or reviews in the next two weeks.</Empty> : coming.map((r) => (
              <div key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 border-b border-rule px-4 py-2.5 last:border-b-0 md:grid-cols-[minmax(0,12rem)_minmax(0,1fr)_auto]">
                <span className="truncate font-semibold">{clientName(r.client_id)}</span>
                <span className="col-start-1 md:col-start-auto">{r.title}<span className="meta block">Docket appears {longDate(addDays(r.next_due, -r.lead_days))}</span></span>
                <span className="col-start-2 row-start-1 num text-mid md:col-start-auto">{longDate(r.next_due)}</span>
              </div>
            ))}
          </Section>
        </div>

        <aside className="min-w-0">
          <Section title="Account checks" action={<span className="label-caps">Yesterday vs 60-day</span>} panel>
            <Conditions />
          </Section>
        </aside>
      </div>
    </div>
  )
}

function MarkDone({ task }: { task: Task }) {
  const { reload } = useData()
  return (
    <button className="btn" onClick={async () => { if (await run(supabase.from('tasks').update({ status: 'done' }).eq('id', task.id), 'Marked done')) reload() }}>
      Mark done
    </button>
  )
}
