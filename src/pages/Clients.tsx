import { Link } from 'react-router-dom'
import { useData, type Client } from '../lib/data'
import { overdue } from '../components/bits'

export function Clients() {
  const { clients, tasks } = useData()
  const groups = clients.filter((c) => clients.some((x) => x.parent_id === c.id))
  const solo = clients.filter((c) => !c.parent_id && !groups.includes(c))
  const sets: [string, Client[]][] = [
    ...groups.map((g) => [g.name, [g, ...clients.filter((c) => c.parent_id === g.id)]] as [string, Client[]]),
    ['Independent', solo.filter((c) => c.status === 'active')],
    ['Setup and prospects', solo.filter((c) => c.status !== 'active')],
  ]
  const count = (c: Client, f: (t: (typeof tasks)[number]) => boolean) => tasks.filter((t) => t.client_id === c.id && f(t)).length

  return (
    <div>
      <h1 className="display text-xl">Clients</h1>
      <p className="meta mt-1">{clients.length - groups.length} clients in {groups.length} groups and on their own.</p>
      {sets.filter(([, list]) => list.length).map(([title, list]) => (
        <section key={title}>
          <header className="h-sec"><h2>{title}</h2><span className="count num">{list.length}</span></header>
          <div className="overflow-x-auto">
            <table className="table min-w-[860px]">
              <thead><tr><th>Client</th><th>Status</th><th>Services</th><th>Key metric</th><th>Reporting</th><th className="r">Open</th><th className="r">Overdue</th></tr></thead>
              <tbody>
                {list.map((c) => {
                  const late = count(c, overdue)
                  return (
                    <tr key={c.id}>
                      <td><Link to={`/c/${c.slug}`} className="font-semibold hover:underline">{c.name}</Link>{groups.includes(c) && <span className="meta block">Group</span>}</td>
                      <td className="whitespace-nowrap">{c.status === 'active' ? 'Active' : c.status[0].toUpperCase() + c.status.slice(1)}{c.priority && <span className="meta block">{c.priority}</span>}</td>
                      <td>{c.services.join(', ')}</td>
                      <td className="max-w-64">{c.key_metric}</td>
                      <td className="max-w-64">{c.reporting}</td>
                      <td className="r">{count(c, (t) => t.status !== 'done')}</td>
                      <td className={`r ${late ? 'font-semibold text-red' : ''}`}>{late}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}
