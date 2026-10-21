import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useMatch, useSearchParams } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Tables } from './database.types'

export type Client = Tables<'clients'>
export type Task = Tables<'tasks'>
export type Profile = Tables<'profiles'>

// Errors are logged for us and shown to people in plain words, never as raw API output.
export function toast(message: string) {
  window.dispatchEvent(new CustomEvent('fsd-toast', { detail: message }))
}
export async function run(op: PromiseLike<{ error: unknown }>, done?: string) {
  const { error } = await op
  if (error) {
    console.error(error)
    toast("That didn't save. Check your connection and try again.")
    return false
  }
  if (done) toast(done)
  return true
}

type Data = {
  session: Session
  me: Profile | null
  clients: Client[]
  profiles: Profile[]
  tasks: Task[] // everything open, plus anything finished in the last 30 days
  ready: boolean
  reload: () => Promise<void>
}
const Ctx = createContext<Data | null>(null)
export const useData = () => useContext(Ctx)!

export function DataProvider({ session, children }: { session: Session; children: ReactNode }) {
  const [state, setState] = useState({ me: null as Profile | null, clients: [] as Client[], profiles: [] as Profile[], tasks: [] as Task[], ready: false })

  const reload = useCallback(async () => {
    const since = new Date(Date.now() - 30 * 864e5).toISOString()
    const [c, p, t] = await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('tasks').select('*').or(`status.neq.done,completed_at.gte."${since}"`).order('ref', { ascending: false }),
    ])
    if (c.error || p.error || t.error) {
      console.error(c.error ?? p.error ?? t.error)
      toast("Couldn't refresh. Showing the last data loaded.")
      return setState((s) => ({ ...s, ready: true }))
    }
    setState({ me: p.data.find((x) => x.id === session.user.id) ?? null, clients: c.data, profiles: p.data, tasks: t.data, ready: true })
  }, [session.user.id])

  useEffect(() => {
    reload()
    const onVisible = () => document.visibilityState === 'visible' && reload()
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [reload])

  return <Ctx.Provider value={{ session, reload, ...state }}>{children}</Ctx.Provider>
}

// The client in the URL (/c/:slug/...). A group includes its brands. useMatch works in layouts too.
export function useScope() {
  const slug = useMatch('/c/:slug/*')?.params.slug
  const { clients } = useData()
  return useMemo(() => {
    const client = clients.find((c) => c.slug === slug)
    const ids = client ? new Set([client.id, ...clients.filter((c) => c.parent_id === client.id).map((c) => c.id)]) : null
    return { client, has: (clientId: string) => !ids || ids.has(clientId), base: client ? `/c/${client.slug}` : '' }
  }, [clients, slug])
}

export function useLookups() {
  const { clients, profiles } = useData()
  return useMemo(() => {
    const byClient = new Map(clients.map((c) => [c.id, c]))
    const byProfile = new Map(profiles.map((p) => [p.id, p]))
    return {
      client: (id: string | null | undefined) => (id ? byClient.get(id) : undefined),
      clientName: (id: string | null | undefined) => (id && byClient.get(id)?.name) || '',
      person: (id: string | null | undefined) => (id && byProfile.get(id)?.full_name) || '',
      isGroup: (id: string) => clients.some((c) => c.parent_id === id),
    }
  }, [clients, profiles])
}

// Tasks open in a dialog over whatever page you're on: ?task=12, or ?task=new&client=slug&type=meta&plan=uuid
export function useTaskLink() {
  const [params, setParams] = useSearchParams()
  return {
    current: params.get('task'),
    open: (ref: number | 'new', extra: Record<string, string> = {}) =>
      setParams((p) => {
        const next = new URLSearchParams(p)
        for (const k of ['task', 'client', 'type', 'plan', 'sendback']) next.delete(k)
        next.set('task', String(ref))
        for (const [k, v] of Object.entries(extra)) next.set(k, v)
        return next
      }),
    close: () =>
      setParams((p) => {
        const next = new URLSearchParams(p)
        for (const k of ['task', 'client', 'type', 'plan', 'sendback']) next.delete(k)
        return next
      }),
    params,
  }
}

export const taskUrl = (ref: number) => `${location.origin}${location.pathname}#/?task=${ref}`
