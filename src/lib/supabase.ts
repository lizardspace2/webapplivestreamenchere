import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Stockage personnalisé qui utilise localStorage avec fallback sur cookies
const customStorage = {
  getItem: (key: string): string | null => {
    try {
      // Essayer d'abord localStorage
      const value = localStorage.getItem(key)
      if (value) return value
      
      // Si pas dans localStorage, essayer les cookies
      const cookies = document.cookie.split(';')
      for (let cookie of cookies) {
        const [name, val] = cookie.trim().split('=')
        if (name === key) {
          const decoded = decodeURIComponent(val)
          // Sauvegarder dans localStorage pour la prochaine fois
          localStorage.setItem(key, decoded)
          return decoded
        }
      }
      return null
    } catch (error) {
      console.error('Error reading from storage:', error)
      return null
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      // Sauvegarder dans localStorage
      localStorage.setItem(key, value)
      
      // Sauvegarder aussi dans un cookie avec expiration longue (1 an)
      const expires = new Date()
      expires.setFullYear(expires.getFullYear() + 1)
      document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`
    } catch (error) {
      console.error('Error writing to storage:', error)
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key)
      // Supprimer aussi le cookie
      document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
    } catch (error) {
      console.error('Error removing from storage:', error)
    }
  },
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
})

export function isSupabaseConfigured(): boolean {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== '' && supabaseAnonKey !== '')
}

