import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { run, useData, useLookups, useScope, useTaskLink, type Client } from '../lib/data'
import { clock, longDate, today } from '../lib/format'
import { ref } from '../lib/model'
import { Toasts } from './bits'
import { Close, Flag, Menu, Moon, Plus, Search, Sun } from './Icons'
import { TaskDialog } from './TaskDialog'

const SECTIONS = ['board', 'plans', 'time'] as const

export function Shell() {
  const { me, ready } = useData()
  const { current } = useTaskLink()
  const drawer = useRef<HTMLDialogElement>(null)
  const { pathname } = useLocation()
  useEffect(() => drawer.current?.close(), [pathname])

  if (!ready) return <p className="meta p-8">Loading…</p>
  if (!me?.role) return <NoAccess />

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh lg:block"><Rail /></aside>
      <dialog ref={drawer} aria-label="Menu" className="m-0 h-dvh max-h-none w-[280px] max-w-[85vw] bg-teal p-0">
        <Rail onClose={() => drawer.current?.close()} />
      </dialog>
      <div className="min-w-0">
        <TopBar onMenu={() => drawer.current?.showModal()} />
        <main className="mx-auto max-w-[1360px] px-4 pb-20 pt-6 lg:px-8"><Outlet /></main>
      </div>
      {current && <TaskDialog key={current} />}
      <Toasts />
    </div>
  )
}

function Rail({ onClose }: { onClose?: () => void }) {
  const { clients, tasks } = useData()
  const { client: scoped, base } = useScope()
  const { pathname } = useLocation()
  const section = SECTIONS.find((s) => pathname.endsWith(`/${s}`))

  // Open work per client drives the bar beside each name; a group counts its brands too.
  const open = useMemo(() => {
    const m = new Map<string, number>()
    for (const t of tasks) if (t.status !== 'done') m.set(t.client_id, (m.get(t.client_id) ?? 0) + 1)
    for (const c of clients) if (c.parent_id) m.set(c.parent_id, (m.get(c.parent_id) ?? 0) + (m.get(c.id) ?? 0))
    return m
  }, [clients, tasks])
  const max = Math.max(1, ...clients.filter((c) => !c.parent_id).map((c) => open.get(c.id) ?? 0))

  const groups = clients.filter((c) => clients.some((x) => x.parent_id === c.id))
  const solo = clients.filter((c) => !c.parent_id && !groups.includes(c))
  const live = solo.filter((c) => c.status === 'active')
  const other = solo.filter((c) => c.status !== 'active')
  const to = (c?: Client) => (c ? `/c/${c.slug}${section ? `/${section}` : ''}` : section ? `/${section}` : '/')

  const nav = [
    { to: '/', label: 'Today', end: true },
    { to: `${base}/board`, label: 'Board' },
    { to: `${base}/plans`, label: 'Plans' },
    { to: `${base}/time`, label: 'Time' },
    { to: '/clients', label: 'Clients' },
  ]
  const item = (c: Client, indent = false) => (
    <li key={c.id}>
      <Link to={to(c)} aria-current={scoped?.id === c.id ? 'page' : undefined}
        className={`grid grid-cols-[1fr_36px] items-center gap-2 rounded-sm py-1 pr-2 ${indent ? 'pl-5' : 'pl-2'} hover:bg-teal-deep aria-[current=page]:bg-teal-deep aria-[current=page]:font-bold`}>
        <span className="truncate">{c.name}</span>
        <span className="h-[3px] bg-on-teal/25" aria-label={`${open.get(c.id) ?? 0} open`}>
          <span className="block h-[3px] bg-on-teal" style={{ width: `${((open.get(c.id) ?? 0) / max) * 100}%` }} />
        </span>
      </Link>
    </li>
  )
  const label = (text: string) => <li className="px-2 pb-1 pt-4 text-s text-on-teal-mid">{text}</li>

  return (
    <nav aria-label="Main" className="flex h-full flex-col bg-teal text-on-teal [&_:focus-visible]:outline-flag-yellow">
      <div className="flex items-start justify-between border-b border-on-teal/20 px-5 pb-4 pt-5">
        <Link to="/" className="block">
          <span className="flex items-end gap-1.5"><span className="text-on-teal"><Flag size={30} /></span><span className="display text-xl">FSD</span></span>
          <span className="mt-1 block text-s uppercase tracking-[0.22em] text-on-teal-mid">WorkSpace</span>
        </Link>
        {onClose && <button className="btn btn-quiet text-on-teal" onClick={onClose} aria-label="Close menu"><Close /></button>}
      </div>
      <ul className="border-b border-on-teal/20 px-3 py-2">
        {nav.map((n) => (
          <li key={n.label}>
            <NavLink to={n.to} end={n.end} className="block rounded-sm px-2 py-1.5 font-semibold hover:bg-teal-deep aria-[current=page]:bg-board aria-[current=page]:text-ink">{n.label}</NavLink>
          </li>
        ))}
      </ul>
      <ul className="flex-1 overflow-y-auto px-3 pb-4 [scrollbar-color:var(--on-teal-mid)_transparent]">
        <li className="pt-3">
          <Link to={to()} aria-current={!scoped ? 'page' : undefined} className="block rounded-sm px-2 py-1 hover:bg-teal-deep aria-[current=page]:bg-teal-deep aria-[current=page]:font-bold">All clients</Link>
        </li>
        {groups.map((g) => [label(g.name), item(g), ...clients.filter((c) => c.parent_id === g.id).map((c) => item(c, true))])}
        {label('Independent')}
        {live.map((c) => item(c))}
        {other.length > 0 && label('Setup and prospects')}
        {other.map((c) => item(c))}
      </ul>
      <Account />
    </nav>
  )
}

function TopBar({ onMenu }: { onMenu: () => void }) {
  const { open } = useTaskLink()
  const { client } = useScope()
  const [times, setTimes] = useState({ syd: clock('Australia/Sydney'), mnl: clock('Asia/Manila') })
  useEffect(() => {
    const id = setInterval(() => setTimes({ syd: clock('Australia/Sydney'), mnl: clock('Asia/Manila') }), 30_000)
    return () => clearInterval(id)
  }, [])
  const newTask = () => open('new', client ? { client: client.slug } : {})

  // N = new task, / = search, anywhere outside a text field.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest('input, textarea, select, [contenteditable], dialog')) return
      if (e.key === 'n') { e.preventDefault(); newTask() }
      if (e.key === '/') { e.preventDefault(); document.getElementById('search')?.focus() }
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  })

  return (
    <header className="sticky top-0 z-30 flex h-[52px] items-center gap-3 border-b border-rule bg-board px-4 lg:px-8">
      <button className="btn btn-quiet -ml-2 lg:hidden" onClick={onMenu} aria-label="Open menu"><Menu /></button>
      <div className="min-w-0">
        <p className="truncate font-semibold">{longDate(today())}</p>
        <p className="meta num truncate">Sydney {times.syd} · Manila {times.mnl}</p>
      </div>
      <TaskSearch />
      <button className="btn btn-ink" onClick={newTask} aria-keyshortcuts="n"><Plus /><span className="hidden sm:inline">New task</span></button>
    </header>
  )
}

function TaskSearch() {
  const { tasks } = useData()
  const { clientName } = useLookups()
  const { open } = useTaskLink()
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase().replace(/^fsd-/, '')
  const hits = needle
    ? tasks.filter((t) => String(t.ref) === needle || `${t.title} ${t.ads} ${clientName(t.client_id)}`.toLowerCase().includes(needle)).slice(0, 8)
    : []
  const pick = (r: number) => { open(r); setQ('') }
  return (
    <div className="relative ml-auto hidden w-[min(380px,36vw)] sm:block">
      <label htmlFor="search" className="sr-only">Search tasks</label>
      <span className="pointer-events-none absolute left-2.5 top-2 text-mid"><Search /></span>
      <input id="search" className="field pl-9" placeholder="Task, FSD ref or ad ID" value={q} aria-keyshortcuts="/"
        onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && hits[0]) pick(hits[0].ref); if (e.key === 'Escape') setQ('') }} />
      {needle && (
        <ul className="sheet absolute inset-x-0 top-10 z-40 max-h-96 overflow-y-auto">
          {hits.length === 0 && <li className="meta px-3 py-2">No task matches “{q}”.</li>}
          {hits.map((t) => (
            <li key={t.id}>
              <button className="grid w-full grid-cols-[64px_1fr] gap-2 border-b border-rule px-3 py-2 text-left hover:bg-ground" onClick={() => pick(t.ref)}>
                <span className="ref">{ref(t.ref)}</span>
                <span className="min-w-0"><span className="block truncate">{t.title}</span><span className="meta block truncate">{clientName(t.client_id)}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Account() {
  const { me, reload } = useData()
  const [name, setName] = useState(me?.full_name ?? '')
  const [pw, setPw] = useState('')
  const [dark, setDark] = useState(document.documentElement.dataset.theme === 'dark')
  const navigate = useNavigate()
  const toggleTheme = () => {
    const next = dark ? 'light' : 'dark'
    document.documentElement.dataset.theme = next
    try { localStorage.setItem('fsd-theme', next) } catch { /* private mode: theme just won't persist */ }
    setDark(!dark)
  }
  return (
    <details className="border-t border-on-teal/20 px-3 py-3">
      <summary className="flex cursor-pointer list-none items-center justify-between rounded-sm px-2 py-1 hover:bg-teal-deep">
        <span className="truncate font-semibold">{me?.full_name}</span>
        <span className="text-s text-on-teal-mid">{me?.role === 'admin' ? 'Admin' : 'Team'}</span>
      </summary>
      <div className="mt-2 space-y-3 rounded-sm bg-board p-3 text-ink">
        <form onSubmit={async (e) => { e.preventDefault(); if (await run(supabase.from('profiles').update({ full_name: name.trim() }).eq('id', me!.id), 'Name saved')) reload() }}>
          <label className="label" htmlFor="me-name">Your name</label>
          <div className="flex gap-2"><input id="me-name" className="field" value={name} maxLength={120} onChange={(e) => setName(e.target.value)} /><button className="btn">Save</button></div>
        </form>
        <form onSubmit={async (e) => { e.preventDefault(); if (pw.length < 10) return; if (await run(supabase.auth.updateUser({ password: pw }), 'Password changed')) setPw('') }}>
          <label className="label" htmlFor="me-pw">New password (10+ characters)</label>
          <div className="flex gap-2"><input id="me-pw" type="password" autoComplete="new-password" className="field" value={pw} minLength={10} onChange={(e) => setPw(e.target.value)} /><button className="btn" disabled={pw.length < 10}>Change</button></div>
        </form>
        <div className="flex justify-between gap-2">
          <button className="btn" onClick={toggleTheme}>{dark ? <Sun /> : <Moon />}{dark ? 'Light' : 'Dark'}</button>
          <button className="btn" onClick={async () => { await supabase.auth.signOut(); navigate('/') }}>Sign out</button>
        </div>
      </div>
    </details>
  )
}

function NoAccess() {
  const { session } = useData()
  return (
    <div className="grid min-h-dvh place-items-center bg-teal p-4 text-on-teal">
      <div className="max-w-md">
        <Flag raised={false} size={40} />
        <h1 className="display mt-3 text-xl">Not cleared yet</h1>
        <p className="mt-3">You're signed in as {session.user.email}, but this account hasn't been given access. Ask Jeremy to switch it on.</p>
        <button className="btn mt-5" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </div>
    </div>
  )
}
