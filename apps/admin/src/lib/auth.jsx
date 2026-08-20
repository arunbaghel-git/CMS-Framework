import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

import { api, setSessionExpiredHandler } from './api.js'

/**
 * Session state — poore admin ka ek hi source.
 *
 * Token yahan **kabhi nahi** rakha jaata. Wo `httpOnly` cookie me hai aur JS use padh
 * hi nahi sakta — CMS me user rich text aur embed HTML daalta hai, isliye XSS surface
 * bada hai (architecture §8.1).
 */

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  /**
   * `loading` shuru me `true` hai — hume abhi pata nahi ki session hai ya nahi.
   *
   * Iske bina refresh karte hi login screen ek jhatke me dikhti hai aur phir gayab ho
   * jaati hai, jabki user logged in tha.
   */
  const [loading, setLoading] = useState(true)

  /** Cookie se session bahaal karta hai — page load / refresh pe. */
  const loadSession = useCallback(async () => {
    try {
      const res = await api.get('/me')
      setUser(res.data.data.user)
    } catch {
      // 401 normal case hai — matlab logged in nahi hai
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSession()
  }, [loadSession])

  useEffect(() => {
    // Refresh bhi fail ho gaya = session sach me khatam. UI ko turant login pe bhejo
    setSessionExpiredHandler(() => setUser(null))
  }, [])

  const login = useCallback(async (credentials) => {
    const res = await api.post('/auth/login', credentials)
    setUser(res.data.data.user)
    return res.data.data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      // Server call fail bhi ho jaaye to UI se bahar to karo hi
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      loading,
      login,
      logout,
      reload: loadSession,
      /**
       * Permission check — role ka naam kabhi mat dekho.
       *
       * `user.role === 'admin'` likhne se custom roles (Phase 7) impossible ho jaate
       * hain, aur UI server se alag faisla lene lagta hai (spec 001).
       */
      can: (permission) => Boolean(user?.permissions?.includes(permission)),
    }),
    [user, loading, login, logout, loadSession],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth ko <AuthProvider> ke andar hi call karo')
  return ctx
}
