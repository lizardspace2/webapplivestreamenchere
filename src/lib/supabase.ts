import { createClient } from '@supabase/supabase-js'

// Clés Supabase intégrées en dur
const supabaseUrl = 'https://teirnropztwqvoajskzw.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlaXJucm9wenR3cXZvYWpza3p3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI2MDUzOTksImV4cCI6MjA3ODE4MTM5OX0.ZUgfafxt0MEoIWL-ifZFzsYpKJ3Dn-qvCM_Rau6qD4Q'

// Stockage personnalisé robuste qui utilise localStorage comme stockage principal
// et sauvegarde aussi dans sessionStorage comme backup
const customStorage = {
  getItem: (key: string): string | null => {
    try {
      // Essayer d'abord localStorage (stockage principal)
      let value = localStorage.getItem(key)
      if (value) {
        console.log(`Storage: Retrieved from localStorage: ${key.substring(0, 20)}...`)
        return value
      }
      
      // Si pas dans localStorage, essayer sessionStorage comme backup
      value = sessionStorage.getItem(key)
      if (value) {
        console.log(`Storage: Retrieved from sessionStorage, restoring to localStorage: ${key.substring(0, 20)}...`)
        // Restaurer dans localStorage pour la prochaine fois
        try {
          localStorage.setItem(key, value)
        } catch (e) {
          console.warn('Storage: Could not restore to localStorage, using sessionStorage only')
        }
        return value
      }
      
      // Essayer les cookies comme dernier recours (pour les très petites valeurs)
      const cookies = document.cookie.split(';')
      for (let cookie of cookies) {
        const trimmed = cookie.trim()
        const equalIndex = trimmed.indexOf('=')
        if (equalIndex === -1) continue
        
        const name = trimmed.substring(0, equalIndex)
        const val = trimmed.substring(equalIndex + 1)
        
        if (name === key) {
          try {
            const decoded = decodeURIComponent(val)
            // Si la valeur est petite, restaurer dans localStorage
            if (decoded.length < 1000) {
              localStorage.setItem(key, decoded)
            }
            console.log(`Storage: Retrieved from cookie: ${key.substring(0, 20)}...`)
            return decoded
          } catch (e) {
            console.warn(`Storage: Error decoding cookie for ${key}:`, e)
          }
        }
      }
      
      console.log(`Storage: No value found for key: ${key.substring(0, 20)}...`)
      return null
    } catch (error) {
      console.error('Storage: Error reading from storage:', error)
      return null
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      // Sauvegarder dans localStorage (stockage principal)
      localStorage.setItem(key, value)
      console.log(`Storage: Saved to localStorage: ${key.substring(0, 20)}... (${value.length} chars)`)
      
      // Sauvegarder aussi dans sessionStorage comme backup
      try {
        sessionStorage.setItem(key, value)
      } catch (e) {
        console.warn('Storage: Could not save to sessionStorage:', e)
      }
      
      // Pour les petites valeurs, sauvegarder aussi dans un cookie avec expiration longue
      // Les cookies ont une limite de ~4KB, donc on ne sauvegarde que les petites valeurs
      if (value.length < 3000) {
        try {
          const expires = new Date()
          expires.setFullYear(expires.getFullYear() + 1)
          const cookieValue = encodeURIComponent(value)
          // Les cookies ont une limite de ~4KB, donc on vérifie
          if (cookieValue.length < 4000) {
            // Utiliser Secure uniquement en HTTPS
            const isSecure = window.location.protocol === 'https:'
            const secureFlag = isSecure ? '; Secure' : ''
            document.cookie = `${key}=${cookieValue}; expires=${expires.toUTCString()}; path=/; SameSite=Lax${secureFlag}`
          } else {
            console.warn(`Storage: Value too large for cookie (${cookieValue.length} chars), skipping cookie storage`)
          }
        } catch (e) {
          console.warn('Storage: Could not save to cookie:', e)
        }
      }
    } catch (error) {
      console.error('Storage: Error writing to storage:', error)
      // En cas d'erreur avec localStorage, essayer sessionStorage
      try {
        sessionStorage.setItem(key, value)
        console.log('Storage: Fallback to sessionStorage successful')
      } catch (e) {
        console.error('Storage: Could not save to sessionStorage either:', e)
      }
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key)
      sessionStorage.removeItem(key)
      // Supprimer aussi le cookie
      document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
      console.log(`Storage: Removed: ${key.substring(0, 20)}...`)
    } catch (error) {
      console.error('Storage: Error removing from storage:', error)
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
  // Les clés sont maintenant intégrées en dur, donc toujours configuré
  return true
}

