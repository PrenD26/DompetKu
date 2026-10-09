import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Dashboard from './pages/Dashboard'
import { btn } from './lib/ui'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  const login = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })

  if (loading) return null
  if (session) return <Dashboard session={session} />

  return (
    <div className="grid min-h-screen place-items-center p-4">
      <div className="w-full max-w-sm rounded-3xl border border-line bg-white p-8 text-center">
        <h1 className="text-3xl font-extrabold text-brand-600">Dompetku</h1>
        <p className="mb-6 mt-2 text-muted">Catat keuanganmu dengan mudah.</p>
        <button className={btn + ' w-full'} onClick={login}>Masuk dengan Google</button>
      </div>
    </div>
  )
}