import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface ProfileData {
  first_name: string | null
  last_name: string | null
  address: string | null
  postal_code: string | null
  city: string | null
  country: string | null
  additional_info: string | null
  phone_country_code: string | null
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
  const [user, setUserState] = useState<User | null>(null)
  const [userRole, setUserRoleState] = useState<'admin' | 'participant' | null>(null)
  const [profile, setProfileState] = useState<ProfileData | null>(null)
  const [loading, setLoadingState] = useState(true)
  const [error, setErrorState] = useState<string | null>(null)
  const [shouldShowAuth, setShouldShowAuthState] = useState(false)

  // Wrappers pour logger les changements d'état
  const setUser = useCallback((newUser: User | null) => {
    setUserState((prevUser) => {
      console.log('AuthContext: setUser - State change:', {
        from: prevUser ? prevUser.id : 'null',
        to: newUser ? newUser.id : 'null',
        email: newUser?.email,
      })
      return newUser
    })
  }, [])

  const setUserRole = useCallback((newRole: 'admin' | 'participant' | null) => {
    setUserRoleState((prevRole) => {
      console.log('AuthContext: setUserRole - State change:', {
        from: prevRole,
        to: newRole,
      })
      return newRole
    })
  }, [])

  const setProfile = useCallback((newProfile: ProfileData | null) => {
    setProfileState((prevProfile) => {
      console.log('AuthContext: setProfile - State change:', {
        from: prevProfile ? 'exists' : 'null',
        to: newProfile ? 'exists' : 'null',
        hasName: !!(newProfile?.first_name && newProfile?.last_name),
      })
      return newProfile
    })
  }, [])

  const setLoading = useCallback((newLoading: boolean) => {
    setLoadingState((prevLoading) => {
      console.log('AuthContext: setLoading - State change:', {
        from: prevLoading,
        to: newLoading,
      })
      return newLoading
    })
  }, [])

  const setError = useCallback((newError: string | null) => {
    setErrorState((prevError) => {
      console.log('AuthContext: setError - State change:', {
        from: prevError,
        to: newError,
      })
      return newError
    })
  }, [])

  const setShouldShowAuth = useCallback((newShouldShow: boolean) => {
    setShouldShowAuthState((prevShouldShow) => {
      console.log('AuthContext: setShouldShowAuth - State change:', {
        from: prevShouldShow,
        to: newShouldShow,
      })
      return newShouldShow
    })
  }, [])

  // Calculer si le profil est complet
  const profileComplete = useMemo(() => {
    const complete = isProfileComplete(profile)
    console.log('AuthContext: profileComplete - Recalculated:', complete, 'profile:', profile ? 'exists' : 'null')
    return complete
  }, [profile])

  // Helpers calculés
  const isAdmin = useMemo(() => {
    const admin = userRole === 'admin'
    console.log('AuthContext: isAdmin - Recalculated:', admin, 'userRole:', userRole)
    return admin
  }, [userRole])
  const isAuthenticated = useMemo(() => {
    const authenticated = !!user
    console.log('AuthContext: isAuthenticated - Recalculated:', authenticated, 'user:', user ? user.id : 'null')
    return authenticated
  }, [user])

  // Charger le rôle de l'utilisateur
  const loadUserRole = useCallback(async (currentUser: User | null) => {
    console.log('AuthContext: loadUserRole - Called with user:', currentUser?.id, currentUser?.email)
    if (!currentUser) {
      console.log('AuthContext: loadUserRole - No user provided, setting role to null')
      setUserRole(null)
      return
    }

    try {
      console.log('AuthContext: loadUserRole - Fetching role for user', currentUser.id)
      
      // Timeout de sécurité : 2 secondes maximum
      const timeoutPromise = new Promise<'admin' | 'participant' | null>((resolve) => {
        setTimeout(() => {
          console.warn('AuthContext: loadUserRole - Timeout reached, defaulting to participant')
          resolve('participant')
        }, 2000)
      })

      const queryPromise = (async () => {
        try {
          console.log('AuthContext: loadUserRole - Starting query for user', currentUser.id)
          
          // Créer un AbortController pour annuler la requête si nécessaire
          const controller = new AbortController()
          const timeoutId = setTimeout(() => {
            console.warn('AuthContext: loadUserRole - AbortController timeout triggered')
            controller.abort()
          }, 2000)
          
          console.log('AuthContext: loadUserRole - Executing query...')
          const startTime = Date.now()
          const { data, error } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUser.id)
            .single()
          const queryTime = Date.now() - startTime
          console.log(`AuthContext: loadUserRole - Query completed in ${queryTime}ms`)
          
          clearTimeout(timeoutId)
          console.log('AuthContext: loadUserRole - Query result - data:', data, 'error:', error)

          if (error) {
            console.warn('AuthContext: loadUserRole - Error fetching role:', error.code, error.message)
            // Si la table n'existe pas ou l'utilisateur n'a pas de profil, retourner participant par défaut
            if (error.code === 'PGRST116' || error.code === '42P01') {
              console.log('AuthContext: loadUserRole - Profile not found, defaulting to participant')
              return 'participant' as 'admin' | 'participant' | null
            }
            // Si erreur RLS ou autre, retourner participant par défaut
            if (error.code === '42501' || error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('policy') || error.message?.includes('RLS') || error.message?.includes('row-level security')) {
              console.warn('AuthContext: loadUserRole - RLS/permission error, defaulting to participant. Error:', error.message)
              console.warn('AuthContext: loadUserRole - Pour corriger, exécutez supabase/fix_profiles_rls.sql dans votre dashboard Supabase')
              return 'participant' as 'admin' | 'participant' | null
            }
            // Log toutes les autres erreurs pour déboguer
            console.error('AuthContext: loadUserRole - Unexpected error:', error)
            return 'participant' as 'admin' | 'participant' | null // Par défaut
          }

          if (!data) {
            console.log('AuthContext: loadUserRole - No data returned, defaulting to participant')
            return 'participant' as 'admin' | 'participant' | null
          }

          const role = (data.role as 'admin' | 'participant' | null) || 'participant'
          console.log('AuthContext: loadUserRole - Role found:', role)
          return role
        } catch (queryError: any) {
          console.error('AuthContext: loadUserRole - Query exception:', queryError)
          return 'participant' as 'admin' | 'participant' | null
        }
      })()

      // Utiliser Promise.race pour avoir un timeout
      const startTime = Date.now()
      const role = await Promise.race([queryPromise, timeoutPromise])
      const roleTime = Date.now() - startTime
      console.log(`AuthContext: loadUserRole - Completed in ${roleTime}ms, role:`, role)
      setUserRole(role)
      console.log('AuthContext: loadUserRole - Role set successfully')
    } catch (e) {
      console.error('AuthContext: loadUserRole - Exception:', e)
      setUserRole('participant') // Par défaut
    }
  }, [])

  // Charger le profil de l'utilisateur
  const loadProfile = useCallback(async (userId: string) => {
    try {
      console.log('AuthContext: loadProfile - Starting for user', userId)
      const startTime = Date.now()
      
      const { data, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, address, postal_code, city, country, additional_info, phone_country_code, phone_number, role')
        .eq('id', userId)
        .single()
      
      const queryTime = Date.now() - startTime
      console.log(`AuthContext: loadProfile - Query completed in ${queryTime}ms`)
      console.log('AuthContext: loadProfile - Result:', { data, error: profileError })

      if (profileError) {
        console.warn('AuthContext: loadProfile - Error details:', {
          code: profileError.code,
          message: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
        })
        if (profileError.code === 'PGRST116') {
          // Profil n'existe pas encore
          console.log('AuthContext: loadProfile - Profile not found (PGRST116)')
          setProfile(null)
          return
        }
        // Si erreur RLS, logger un avertissement mais continuer
        if (profileError.code === '42501' || profileError.code === 'PGRST301' || profileError.message?.includes('permission') || profileError.message?.includes('policy') || profileError.message?.includes('RLS') || profileError.message?.includes('row-level security')) {
          console.warn('AuthContext: loadProfile - RLS/permission error. Pour corriger, exécutez supabase/fix_profiles_rls.sql dans votre dashboard Supabase')
        }
        console.warn('AuthContext: loadProfile - Other error, setting profile to null')
        setProfile(null)
        return
      }

      if (data) {
        console.log('AuthContext: loadProfile - Setting profile data:', data)
        setProfile({
          first_name: data.first_name,
          last_name: data.last_name,
          address: data.address,
          postal_code: data.postal_code,
          city: data.city,
          country: data.country,
          additional_info: data.additional_info,
          phone_country_code: data.phone_country_code,
          phone_number: data.phone_number,
          role: (data.role as 'admin' | 'participant') || 'participant',
        })
        console.log('AuthContext: loadProfile - Profile set successfully')
      } else {
        console.log('AuthContext: loadProfile - No data returned, setting profile to null')
        setProfile(null)
      }
    } catch (e) {
      console.error('AuthContext: loadProfile - Exception:', e)
      setProfile(null)
    }
  }, [])

  // Rafraîchir l'utilisateur
  const refreshUser = useCallback(async () => {
    console.log('AuthContext: refreshUser - Called')
    try {
      console.log('AuthContext: refreshUser - Fetching user from Supabase...')
      const startTime = Date.now()
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      const fetchTime = Date.now() - startTime
      console.log(`AuthContext: refreshUser - getUser completed in ${fetchTime}ms`)
      
      if (authError) {
        console.error('AuthContext: refreshUser - Error refreshing user:', {
          code: authError.code,
          message: authError.message,
          name: authError.name,
        })
        console.log('AuthContext: refreshUser - Clearing user state due to error')
        setUser(null)
        setUserRole(null)
        setProfile(null)
        return
      }

      console.log('AuthContext: refreshUser - User fetched:', user ? { id: user.id, email: user.email } : 'null')
      setUser(user)
      console.log('AuthContext: refreshUser - User state updated')
      
      if (user) {
        console.log('AuthContext: refreshUser - Loading role and profile in parallel for user:', user.id)
        const parallelStartTime = Date.now()
        // Charger le rôle et le profil en parallèle
        await Promise.all([
          loadUserRole(user),
          loadProfile(user.id)
        ])
        const parallelTime = Date.now() - parallelStartTime
        console.log(`AuthContext: refreshUser - Parallel load completed in ${parallelTime}ms`)
      } else {
        console.log('AuthContext: refreshUser - No user, clearing role and profile')
        setUserRole(null)
        setProfile(null)
      }
      console.log('AuthContext: refreshUser - Completed successfully')
    } catch (error) {
      console.error('AuthContext: refreshUser - Exception:', error)
      console.log('AuthContext: refreshUser - Clearing all state due to exception')
      setUser(null)
      setUserRole(null)
      setProfile(null)
    }
  }, [loadUserRole, loadProfile])

  // Rafraîchir uniquement le profil
  const refreshProfile = useCallback(async () => {
    if (!user) {
      console.log('AuthContext: refreshProfile - No user, cannot refresh')
      return
    }
    
    try {
      console.log('AuthContext: refreshProfile - Refreshing profile for user:', user.id)
      await loadProfile(user.id)
      console.log('AuthContext: refreshProfile - Profile refreshed successfully')
    } catch (error) {
      console.error('AuthContext: refreshProfile - Failed to refresh profile:', error)
    }
  }, [user, loadProfile])

  // Fonction pour exiger l'authentification
  const requireAuth = useCallback(() => {
    console.log('AuthContext: requireAuth - Called, isAuthenticated:', isAuthenticated)
    if (!isAuthenticated) {
      console.log('AuthContext: requireAuth - Not authenticated, showing auth modal')
      setShouldShowAuth(true)
      return false
    }
    console.log('AuthContext: requireAuth - Authenticated, access granted')
    return true
  }, [isAuthenticated])

  // Fonction pour exiger les droits admin
  const requireAdmin = useCallback(() => {
    console.log('AuthContext: requireAdmin - Called, isAuthenticated:', isAuthenticated, 'isAdmin:', isAdmin)
    if (!isAuthenticated) {
      console.log('AuthContext: requireAdmin - Not authenticated, showing auth modal')
      setShouldShowAuth(true)
      return false
    }
    if (!isAdmin) {
      console.warn('AuthContext: requireAdmin - User is authenticated but not admin')
      setError('Accès refusé : droits administrateur requis')
      return false
    }
    console.log('AuthContext: requireAdmin - Admin access granted')
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
        console.log('AuthContext: Checking storage for session...')
        
        // Essayer d'abord de récupérer la session depuis le storage
        // getSession() récupère la session depuis le stockage personnalisé (localStorage + sessionStorage + cookies)
        // C'est la méthode recommandée pour récupérer une session persistée
        let { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        console.log('AuthContext: Session from storage:', session ? 'found' : 'not found', session?.user?.email)
        if (session) {
          console.log('AuthContext: Session expires at:', session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'N/A')
        }
        
        if (sessionError) {
          console.warn('AuthContext: Session error:', sessionError)
        }
        
        // Si la session existe mais est expirée, Supabase devrait la rafraîchir automatiquement
        // Vérifier si la session est valide
        if (session && session.expires_at) {
          const expiresAt = new Date(session.expires_at * 1000)
          const now = new Date()
          const timeUntilExpiry = expiresAt.getTime() - now.getTime()
          console.log('AuthContext: Session expires in:', Math.round(timeUntilExpiry / 1000), 'seconds')
          
          if (expiresAt < now) {
            console.log('AuthContext: Session expired, attempting refresh...')
            // Essayer de rafraîchir la session
            const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
            if (!refreshError && refreshedSession) {
              session = refreshedSession
              console.log('AuthContext: Session refreshed successfully')
            } else {
              console.warn('AuthContext: Failed to refresh session:', refreshError)
              session = null
            }
          } else if (timeUntilExpiry < 60 * 60 * 1000) {
            // Si la session expire dans moins d'une heure, la rafraîchir préventivement
            console.log('AuthContext: Session expiring soon, refreshing preventively...')
            const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession()
            if (!refreshError && refreshedSession) {
              session = refreshedSession
              console.log('AuthContext: Session refreshed preventively')
            }
          }
        }
        
        // Si on a une session, utiliser l'utilisateur de la session
        let user = session?.user ?? null
        
        // Si pas de session dans le storage, essayer getUser qui peut récupérer depuis le serveur
        // Cela peut fonctionner si le token est encore valide côté serveur
        if (!user) {
          console.log('AuthContext: No session in storage, trying getUser...')
          const { data: { user: fetchedUser }, error: authError } = await supabase.auth.getUser()
          if (authError) {
            console.warn('AuthContext: Auth error:', authError)
            // Ne pas définir d'erreur si c'est juste "pas d'utilisateur" ou token invalide
            if (authError.message !== 'User not found' && 
                authError.message !== 'Invalid Refresh Token' &&
                !authError.message.includes('JWT')) {
              setError(authError.message)
            }
          }
          user = fetchedUser
          console.log('AuthContext: User from getUser:', user ? 'found' : 'not found', user?.email)
        }
        
        if (!mounted) return
        
        hasUser = !!user
        setUser(user)
        
        if (user) {
          console.log('AuthContext: User found:', user.id, user.email)
          console.log('AuthContext: Starting parallel load of role and profile...')
          const parallelStartTime = Date.now()
          // Charger le rôle et le profil en parallèle pour de meilleures performances
          try {
            await Promise.all([
              loadUserRole(user),
              loadProfile(user.id)
            ])
            const parallelTime = Date.now() - parallelStartTime
            console.log(`AuthContext: Parallel load completed in ${parallelTime}ms`)
            
            // Vérifier que le profil a bien été chargé
            if (mounted) {
              // Attendre un peu pour que le state soit mis à jour
              await new Promise(resolve => setTimeout(resolve, 100))
              console.log('AuthContext: Profile loaded, checking state...')
            }
          } catch (error) {
            console.error('AuthContext: Error loading user data:', error)
          }
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
    // Cet écouteur se déclenche automatiquement quand la session change
    // Il est important pour détecter les changements de session (connexion, déconnexion, refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
      if (!mounted) return
      
      console.log('AuthContext: Auth state changed:', event)
      console.log('AuthContext: Session:', session ? 'exists' : 'null', session?.user?.id, session?.user?.email)
      
      const currentUser = session?.user ?? null
      console.log('AuthContext: Setting user:', currentUser?.id, currentUser?.email)
      
      // Mettre à jour l'utilisateur immédiatement
      setUser(currentUser)
      setError(null)
      
      if (currentUser) {
        // Si on a un utilisateur, ne pas afficher le modal d'auth
        setShouldShowAuth(false)
        console.log('AuthContext: Loading role and profile for user:', currentUser.id)
        // Charger le rôle et le profil en parallèle
        try {
          const authChangeStartTime = Date.now()
          await Promise.all([
            loadUserRole(currentUser),
            loadProfile(currentUser.id)
          ])
          const authChangeTime = Date.now() - authChangeStartTime
          console.log(`AuthContext: Auth change load completed in ${authChangeTime}ms`)
        } catch (error) {
          console.error('AuthContext: Error loading user data on auth change:', error)
        }
      } else {
        console.log('AuthContext: No user in session, clearing role and profile')
        setUserRole(null)
        setProfile(null)
        // Si déconnexion, ne pas afficher le modal d'auth
        if (event === 'SIGNED_OUT') {
          setShouldShowAuth(false)
        } else if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          // Si refresh ou connexion mais pas d'utilisateur, c'est étrange
          console.warn('AuthContext: Event', event, 'but no user in session')
        }
      }
    })

    return () => {
      mounted = false
      clearTimeout(loadingTimeout)
      subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // loadUserRole et loadProfile sont stables grâce à useCallback

  // Déconnexion
  const signOut = useCallback(async () => {
    console.log('AuthContext: signOut - Called')
    try {
      console.log('AuthContext: signOut - Calling supabase.auth.signOut()...')
      const startTime = Date.now()
      const { error } = await supabase.auth.signOut()
      const signOutTime = Date.now() - startTime
      console.log(`AuthContext: signOut - signOut completed in ${signOutTime}ms`)
      
      if (error) {
        console.error('AuthContext: signOut - Error during sign out:', error)
        setError('Erreur lors de la déconnexion')
        return
      }
      
      console.log('AuthContext: signOut - Clearing all state')
      setUser(null)
      setUserRole(null)
      setProfile(null)
      setShouldShowAuth(false)
      setError(null)
      console.log('AuthContext: signOut - Completed successfully')
    } catch (error) {
      console.error('AuthContext: signOut - Exception:', error)
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
  console.log('AuthContext: useAuth - Hook called')
  const context = useContext(AuthContext)
  if (context === undefined) {
    console.error('AuthContext: useAuth - Used outside AuthProvider!')
    throw new Error('useAuth must be used within an AuthProvider')
  }
  console.log('AuthContext: useAuth - Context retrieved:', {
    user: context.user ? context.user.id : 'null',
    userRole: context.userRole,
    isAuthenticated: context.isAuthenticated,
    isAdmin: context.isAdmin,
    loading: context.loading,
  })
  return context
}

// Hook pour exiger l'authentification
export function useRequireAuth() {
  console.log('AuthContext: useRequireAuth - Hook called')
  const { isAuthenticated, requireAuth, loading } = useAuth()
  console.log('AuthContext: useRequireAuth - Returning:', { isAuthenticated, loading })
  
  return {
    isAuthenticated,
    loading,
    requireAuth,
  }
}

// Hook pour exiger les droits admin
export function useRequireAdmin() {
  console.log('AuthContext: useRequireAdmin - Hook called')
  const { isAdmin, isAuthenticated, requireAdmin, loading } = useAuth()
  console.log('AuthContext: useRequireAdmin - Returning:', { isAdmin, isAuthenticated, loading })
  
  return {
    isAdmin,
    isAuthenticated,
    loading,
    requireAdmin,
  }
}

