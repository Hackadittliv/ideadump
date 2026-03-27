import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'

async function checkBetaApproved(email) {
  const { data } = await supabase
    .from('ideadump_beta_signups')
    .select('approved')
    .eq('email', email.toLowerCase())
    .single()
  return data?.approved === true
}

export function useAuth() {
  const [user, setUser]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [betaApproved, setBetaApproved] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) setBetaApproved(await checkBetaApproved(u.email))
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) setBetaApproved(await checkBetaApproved(u.email))
      else setBetaApproved(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })

  const signInWithEmail = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  const signUpWithEmail = (email, password) =>
    supabase.auth.signUp({ email, password })

  const signOut = () => supabase.auth.signOut()

  return { user, loading, betaApproved, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut }
}
