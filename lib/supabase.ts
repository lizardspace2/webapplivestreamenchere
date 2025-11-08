import { createClient } from '@supabase/supabase-js'

/**
 * Configuration Supabase centralisée
 * 
 * Tous les composants doivent utiliser le client `supabase` exporté depuis ce fichier
 * au lieu de créer leur propre client. Cela garantit l'utilisation cohérente des
 * variables d'environnement configurées dans Vercel :
 * - NEXT_PUBLIC_SUPABASE_URL
 * - NEXT_PUBLIC_SUPABASE_ANON_KEY
 * 
 * @see env.example pour la configuration des variables d'environnement
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Vérifier que les variables d'environnement sont configurées
if (!supabaseUrl || !supabaseAnonKey) {
  if (typeof window !== 'undefined') {
    console.error(
      '❌ Supabase n\'est pas configuré!\n\n' +
      'Veuillez créer un fichier .env.local à la racine du projet avec:\n' +
      'NEXT_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co\n' +
      'NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_supabase\n\n' +
      'Consultez env.example pour plus de détails.'
    )
  }
}

// Créer le client Supabase avec persistance de session
// Utiliser localStorage pour persister la session entre les rechargements
export const supabase = createClient(
  supabaseUrl || 'https://invalid.supabase.co',
  supabaseAnonKey || 'invalid-key',
  {
    auth: {
      persistSession: true,
      storage: typeof window !== 'undefined' ? {
        getItem: (key: string) => {
          try {
            return window.localStorage.getItem(key)
          } catch (error) {
            console.error('Error reading from localStorage:', error)
            return null
          }
        },
        setItem: (key: string, value: string) => {
          try {
            window.localStorage.setItem(key, value)
          } catch (error) {
            console.error('Error writing to localStorage:', error)
          }
        },
        removeItem: (key: string) => {
          try {
            window.localStorage.removeItem(key)
          } catch (error) {
            console.error('Error removing from localStorage:', error)
          }
        },
      } : undefined,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'supabase.auth.token', // Clé spécifique pour le stockage
    },
  }
)

// Fonction helper pour vérifier si Supabase est configuré
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && 
           supabaseUrl !== 'https://votre-projet.supabase.co' &&
           supabaseAnonKey !== 'votre_cle_anon_supabase')
}

