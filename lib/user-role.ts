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
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error) {
      console.warn('getUserRole: Error fetching role:', error)
      // Si la table n'existe pas ou l'utilisateur n'a pas de profil, retourner participant par défaut
      if (error.code === 'PGRST116' || error.code === '42P01') {
        console.log('getUserRole: Profile not found, defaulting to participant')
        return 'participant'
      }
      return 'participant' // Par défaut
    }

    if (!data) {
      console.log('getUserRole: No data returned, defaulting to participant')
      return 'participant'
    }

    const role = (data.role as UserRole) || 'participant'
    console.log('getUserRole: Role found:', role)
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

