'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { getUserRole } from '@/lib/user-role'
import type { User } from '@supabase/supabase-js'

interface AuthContextType {
  user: User | null
  userRole: 'admin' | 'participant' | null
  loading: boolean
  error: string | null
  shouldShowAuth: boolean
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  clearError: () => void
  setShouldShowAuth: (show: boolean) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<'admin' | 'participant' | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shouldShowAuth, setShouldShowAuth] = useState(false)

  async function loadUserRole(currentUser: User | null) {
    if (!currentUser) {
      setUserRole(null)
      return
    }

    try {
      // getUserRole a déjà son propre timeout, mais on ajoute une sécurité supplémentaire
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
    let loadingTimeout: NodeJS.Timeout
    let hasUser = false

    // Timeout de sécurité : arrêter le chargement après 3 secondes
    loadingTimeout = setTimeout(() => {
      if (mounted) {
        console.log('Auth loading timeout - stopping loading')
        setLoading(false)
        // Si pas d'utilisateur après timeout, proposer la connexion
        if (!hasUser) {
          setShouldShowAuth(true)
        }
      }
    }, 3000)

    // Charger l'utilisateur initial
    async function initAuth() {
      try {
        console.log('AuthContext: Initializing auth...')
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          console.warn('AuthContext: Auth error:', authError)
          setError(authError.message)
        }
        
        if (!mounted) return
        
        hasUser = !!user
        setUser(user)
        
        if (user) {
          try {
            await loadUserRole(user)
          } catch (roleError) {
            console.error('AuthContext: Error loading role:', roleError)
            // Continuer même si le rôle échoue
          }
        } else {
          // Pas d'utilisateur, proposer la connexion
          setShouldShowAuth(true)
        }
      } catch (error: any) {
        console.error('AuthContext: Failed to init auth:', error)
        setError(error.message || 'Erreur de connexion')
        setShouldShowAuth(true)
      } finally {
        if (mounted) {
          clearTimeout(loadingTimeout)
          setLoading(false)
        }
      }
    }

    initAuth()

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      console.log('AuthContext: Auth state changed:', event)
      const currentUser = session?.user ?? null
      setUser(currentUser)
      setError(null)
      setShouldShowAuth(false)
      
      if (currentUser) {
        try {
          await loadUserRole(currentUser)
        } catch (roleError) {
          console.error('AuthContext: Error loading role on auth change:', roleError)
        }
      } else {
        setUserRole(null)
        if (event === 'SIGNED_OUT') {
          setShouldShowAuth(false)
        }
      }
    })

    return () => {
      mounted = false
      clearTimeout(loadingTimeout)
      subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setUserRole(null)
      setShouldShowAuth(false)
    } catch (error) {
      console.error('Failed to sign out:', error)
    }
  }

  function clearError() {
    setError(null)
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      userRole, 
      loading, 
      error,
      shouldShowAuth,
      signOut, 
      refreshUser,
      clearError,
      setShouldShowAuth
    }}>
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

