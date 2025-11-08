'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { getUserRole } from '@/lib/user-role'
import type { User } from '@supabase/supabase-js'

interface ProfileData {
  first_name: string | null
  last_name: string | null
  address: string | null
  postal_code: string | null
  city: string | null
  country: string | null
  phone_number: string | null
  role: 'admin' | 'participant' | null
}

interface AuthContextType {
  // États
  user: User | null
  userRole: 'admin' | 'participant' | null
  profile: ProfileData | null
  profileComplete: boolean
  loading: boolean
  error: string | null
  shouldShowAuth: boolean
  
  // Actions
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  refreshProfile: () => Promise<void>
  clearError: () => void
  setShouldShowAuth: (show: boolean) => void
  
  // Helpers
  isAdmin: boolean
  isAuthenticated: boolean
  requireAuth: () => boolean
  requireAdmin: () => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Fonction pour vérifier si un profil est complet
function isProfileComplete(profile: ProfileData | null): boolean {
  if (!profile) return false
  
  return !!(
    profile.first_name &&
    profile.last_name &&
    profile.address &&
    profile.postal_code &&
    profile.city &&
    profile.country &&
    profile.phone_number
  )
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<'admin' | 'participant' | null>(null)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [shouldShowAuth, setShouldShowAuth] = useState(false)

  // Calculer si le profil est complet
  const profileComplete = useMemo(() => isProfileComplete(profile), [profile])

  // Helpers calculés
  const isAdmin = useMemo(() => userRole === 'admin', [userRole])
  const isAuthenticated = useMemo(() => !!user, [user])

  // Charger le rôle de l'utilisateur
  const loadUserRole = useCallback(async (currentUser: User | null) => {
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
  }, [])

  // Charger le profil de l'utilisateur
  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, address, postal_code, city, country, phone_number, role')
        .eq('id', userId)
        .single()

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // Profil n'existe pas encore
          setProfile(null)
          return
        }
        console.warn('Error loading profile:', profileError)
        setProfile(null)
        return
      }

      if (data) {
        setProfile({
          first_name: data.first_name,
          last_name: data.last_name,
          address: data.address,
          postal_code: data.postal_code,
          city: data.city,
          country: data.country,
          phone_number: data.phone_number,
          role: (data.role as 'admin' | 'participant') || 'participant',
        })
      } else {
        setProfile(null)
      }
    } catch (e) {
      console.error('Failed to load profile:', e)
      setProfile(null)
    }
  }, [])

  // Rafraîchir l'utilisateur
  const refreshUser = useCallback(async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError) {
        console.error('Error refreshing user:', authError)
        setUser(null)
        setUserRole(null)
        setProfile(null)
        return
      }

      setUser(user)
      
      if (user) {
        // Charger le rôle et le profil en parallèle
        await Promise.all([
          loadUserRole(user),
          loadProfile(user.id)
        ])
      } else {
        setUserRole(null)
        setProfile(null)
      }
    } catch (error) {
      console.error('Failed to refresh user:', error)
      setUser(null)
      setUserRole(null)
      setProfile(null)
    }
  }, [loadUserRole, loadProfile])

  // Rafraîchir uniquement le profil
  const refreshProfile = useCallback(async () => {
    if (!user) return
    
    try {
      await loadProfile(user.id)
    } catch (error) {
      console.error('Failed to refresh profile:', error)
    }
  }, [user, loadProfile])

  // Fonction pour exiger l'authentification
  const requireAuth = useCallback(() => {
    if (!isAuthenticated) {
      setShouldShowAuth(true)
      return false
    }
    return true
  }, [isAuthenticated])

  // Fonction pour exiger les droits admin
  const requireAdmin = useCallback(() => {
    if (!isAuthenticated) {
      setShouldShowAuth(true)
      return false
    }
    if (!isAdmin) {
      setError('Accès refusé : droits administrateur requis')
      return false
    }
    return true
  }, [isAuthenticated, isAdmin])

  // Initialisation
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
        
        // Essayer d'abord de récupérer la session depuis le storage
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.warn('AuthContext: Session error:', sessionError)
        }
        
        // Si pas de session, essayer getUser
        let user = session?.user ?? null
        if (!user) {
          const { data: { user: fetchedUser }, error: authError } = await supabase.auth.getUser()
          if (authError) {
            console.warn('AuthContext: Auth error:', authError)
            setError(authError.message)
          }
          user = fetchedUser
        }
        
        if (!mounted) return
        
        hasUser = !!user
        setUser(user)
        
        if (user) {
          console.log('AuthContext: User found:', user.id, user.email)
          // Charger le rôle et le profil en parallèle pour de meilleures performances
          await Promise.all([
            loadUserRole(user),
            loadProfile(user.id)
          ])
        } else {
          console.log('AuthContext: No user found')
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
        // Charger le rôle et le profil en parallèle
        try {
          await Promise.all([
            loadUserRole(currentUser),
            loadProfile(currentUser.id)
          ])
        } catch (error) {
          console.error('AuthContext: Error loading user data on auth change:', error)
        }
      } else {
        setUserRole(null)
        setProfile(null)
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
  }, [loadUserRole, loadProfile])

  // Déconnexion
  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      setUserRole(null)
      setProfile(null)
      setShouldShowAuth(false)
      setError(null)
    } catch (error) {
      console.error('Failed to sign out:', error)
      setError('Erreur lors de la déconnexion')
    }
  }, [])

  // Nettoyer les erreurs
  const clearError = useCallback(() => {
    setError(null)
  }, [])

  // Valeur du contexte
  const contextValue = useMemo(() => ({
    user,
    userRole,
    profile,
    profileComplete,
    loading,
    error,
    shouldShowAuth,
    signOut,
    refreshUser,
    refreshProfile,
    clearError,
    setShouldShowAuth,
    isAdmin,
    isAuthenticated,
    requireAuth,
    requireAdmin,
  }), [
    user,
    userRole,
    profile,
    profileComplete,
    loading,
    error,
    shouldShowAuth,
    signOut,
    refreshUser,
    refreshProfile,
    clearError,
    isAdmin,
    isAuthenticated,
    requireAuth,
    requireAdmin,
  ])

  return (
    <AuthContext.Provider value={contextValue}>
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

// Hook pour exiger l'authentification
export function useRequireAuth() {
  const { isAuthenticated, requireAuth, loading } = useAuth()
  
  return {
    isAuthenticated,
    loading,
    requireAuth,
  }
}

// Hook pour exiger les droits admin
export function useRequireAdmin() {
  const { isAdmin, isAuthenticated, requireAdmin, loading } = useAuth()
  
  return {
    isAdmin,
    isAuthenticated,
    loading,
    requireAdmin,
  }
}
