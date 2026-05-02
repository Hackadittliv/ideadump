import { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { authedFetch } from './authedFetch.js'

async function checkBetaApproved() {
  const res = await authedFetch('/.netlify/functions/check-beta-approved', { method: 'POST' })
  if (!res.ok) return false
  const data = await res.json().catch(() => ({}))
  return data?.approved === true
}

export function useAuth() {
  const [user, setUser]             = useState(null)
  const [loading, setLoading]       = useState(true)
  const [betaApproved, setBetaApproved] = useState(false)

  useEffect(() => {
    // VIKTIGT: Inte await:a andra Supabase-anrop inuti onAuthStateChange
    // — det deadlockar auth-SDK:n. Beta-kollen körs fire-and-forget.
    let activeUserId = null
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user ?? null
      activeUserId = u?.id ?? null
      const checkUserId = activeUserId
      setUser(u)
      setLoading(false)
      if (u) {
        checkBetaApproved()
          .then(approved => {
            // Skydd mot stale promise om sessionen bytts under hämtningen
            if (activeUserId === checkUserId) setBetaApproved(approved)
          })
          .catch(err => {
            console.error('[Auth] checkBetaApproved error:', err)
            if (activeUserId === checkUserId) setBetaApproved(false)
          })
      } else {
        setBetaApproved(false)
      }
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
