import { supabase } from './supabase'
import type { User } from '@supabase/supabase-js'

export type UserRole = 'admin' | 'participant' | null

export async function getUserRole(user: User | null): Promise<UserRole> {
  if (!user) return null

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (error || !data) {
      return 'participant' // Par défaut
    }

    return (data.role as UserRole) || 'participant'
  } catch (e) {
    console.warn('Failed to get user role:', e)
    return 'participant' // Par défaut
  }
}

export async function isAdmin(user: User | null): Promise<boolean> {
  const role = await getUserRole(user)
  return role === 'admin'
}

