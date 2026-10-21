import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import './index.css'
import { supabase } from './lib/supabase'
import { DataProvider } from './lib/data'
import { Shell } from './components/Shell'
import { SignIn } from './pages/SignIn'
import { Today } from './pages/Today'
import { Board } from './pages/Board'
import { Clients } from './pages/Clients'
import { ClientPage } from './pages/Client'
import { Plans, PlanPage } from './pages/Plans'
import { Time } from './pages/Time'

// Theme: the viewer's saved choice, else their system setting.
let saved: string | null = null
try { saved = localStorage.getItem('fsd-theme') } catch { /* storage blocked */ }
document.documentElement.dataset.theme = saved ?? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')

function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  if (!session) return <SignIn />
  return (
    <DataProvider session={session}>
      <HashRouter>
        <Routes>
          <Route element={<Shell />}>
            <Route index element={<Today />} />
            <Route path="board" element={<Board />} />
            <Route path="plans" element={<Plans />} />
            <Route path="plans/:id" element={<PlanPage />} />
            <Route path="time" element={<Time />} />
            <Route path="clients" element={<Clients />} />
            <Route path="c/:slug" element={<ClientPage />} />
            <Route path="c/:slug/board" element={<Board />} />
            <Route path="c/:slug/plans" element={<Plans />} />
            <Route path="c/:slug/time" element={<Time />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </HashRouter>
    </DataProvider>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
