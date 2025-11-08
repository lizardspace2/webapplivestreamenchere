'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { getUserRole } from '@/lib/user-role'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  userRole: 'admin' | 'participant' | null
  loading: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<'admin' | 'participant' | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadUserRole(currentUser: User | null) {
    if (!currentUser) {
      setUserRole(null)
      return
    }

    try {
      const role = await getUserRole(currentUser)
      setUserRole(role)
    } catch (error) {
      console.error('Failed to load user role:', error)
      setUserRole('participant') // Par défaut
    }
  }

  async function refreshUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      await loadUserRole(user)
    } catch (error) {
      console.error('Failed to refresh user:', error)
      setUser(null)
      setUserRole(null)
    }
  }

  useEffect(() => {
    let mounted = true

    // Charger l'utilisateur initial
    async function initAuth() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!mounted) return
        
        setUser(user)
        await loadUserRole(user)
      } catch (error) {
        console.error('Failed to init auth:', error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initAuth()

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      const currentUser = session?.user ?? null
      setUser(currentUser)
      await loadUserRole(currentUser)
      
      if (event === 'SIGNED_OUT') {
        setUserRole(null)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setUserRole(null)
    } catch (error) {
      console.error('Failed to sign out:', error)
    }
  }

  return (
    <AuthContext.Provider value={{ user, userRole, loading, signOut, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

