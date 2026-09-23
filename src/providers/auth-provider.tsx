import type { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState, type PropsWithChildren } from 'react'
import { AppState } from 'react-native'

import { supabase } from '@/lib/supabase'

type AuthContextValue = {
  session: Session | null
  // True until the saved session has been read from storage
  loading: boolean
  // The new login email, once a pending email change has been confirmed; null otherwise
  emailChangedTo: string | null
  dismissEmailChanged: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

// How often to check whether a pending email change has been confirmed
const EMAIL_CHECK_INTERVAL = 10 * 1000

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [emailChangedTo, setEmailChangedTo] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  // An email change is confirmed on Supabase's side (from the email links), so the saved session
  // doesn't know about it. While one is pending, ask the server for the current user; once the email
  // differs, refresh the session so the app uses the new one, and announce it.
  const currentEmail = session?.user.email
  const pendingEmail = session?.user.new_email
  useEffect(() => {
    if (!pendingEmail) return

    let cancelled = false
    const check = async () => {
      const { data } = await supabase.auth.getUser()
      if (cancelled || !data.user?.email || data.user.email === currentEmail) return
      await supabase.auth.refreshSession()
      if (!cancelled) setEmailChangedTo(data.user.email)
    }

    check()
    const interval = setInterval(check, EMAIL_CHECK_INTERVAL)
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') check()
    })
    return () => {
      cancelled = true
      clearInterval(interval)
      subscription.remove()
    }
  }, [currentEmail, pendingEmail])

  return (
    <AuthContext.Provider
      value={{ session, loading, emailChangedTo, dismissEmailChanged: () => setEmailChangedTo(null) }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
