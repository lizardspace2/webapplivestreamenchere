import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

export type UserRole = 'admin' | 'participant' | null

export async function getUserRole(user: User | null): Promise<UserRole> {
  if (!user) {
    console.log('getUserRole: No user provided')
    return null
  }

  try {
    console.log('getUserRole: Fetching role for user', user.id)
    
    // Timeout de sécurité : 2 secondes maximum
    const timeoutPromise = new Promise<UserRole>((resolve) => {
      setTimeout(() => {
        console.warn('getUserRole: Timeout reached, defaulting to participant')
        resolve('participant')
      }, 2000)
    })

    const queryPromise = (async () => {
      try {
        console.log('getUserRole: Starting query for user', user.id)
        
        // Créer un AbortController pour annuler la requête si nécessaire
        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
          console.warn('getUserRole: AbortController timeout triggered')
          controller.abort()
        }, 2000)
        
        console.log('getUserRole: Executing query...')
        const startTime = Date.now()
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        const queryTime = Date.now() - startTime
        console.log(`getUserRole: Query completed in ${queryTime}ms`)
        
        clearTimeout(timeoutId)
        console.log('getUserRole: Query result - data:', data, 'error:', error)

        if (error) {
          console.warn('getUserRole: Error fetching role:', error.code, error.message)
          // Si la table n'existe pas ou l'utilisateur n'a pas de profil, retourner participant par défaut
          if (error.code === 'PGRST116' || error.code === '42P01') {
            console.log('getUserRole: Profile not found, defaulting to participant')
            return 'participant' as UserRole
          }
          // Si erreur RLS ou autre, retourner participant par défaut
          if (error.code === '42501' || error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('policy') || error.message?.includes('RLS')) {
            console.warn('getUserRole: RLS/permission error, defaulting to participant. Error:', error.message)
            return 'participant' as UserRole
          }
          // Log toutes les autres erreurs pour déboguer
          console.error('getUserRole: Unexpected error:', error)
          return 'participant' as UserRole // Par défaut
        }

        if (!data) {
          console.log('getUserRole: No data returned, defaulting to participant')
          return 'participant' as UserRole
        }

        const role = (data.role as UserRole) || 'participant'
        console.log('getUserRole: Role found:', role)
        return role
      } catch (queryError: any) {
        console.error('getUserRole: Query exception:', queryError)
        return 'participant' as UserRole
      }
    })()

    // Utiliser Promise.race pour avoir un timeout
    const role = await Promise.race([queryPromise, timeoutPromise])
    return role
  } catch (e) {
    console.error('getUserRole: Exception:', e)
    return 'participant' // Par défaut
  }
}

export async function isAdmin(user: User | null): Promise<boolean> {
  const role = await getUserRole(user)
  return role === 'admin'
}

