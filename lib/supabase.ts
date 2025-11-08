import { createClient } from '@supabase/supabase-js'

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
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
)

// Fonction helper pour vérifier si Supabase est configuré
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && 
           supabaseUrl !== 'https://votre-projet.supabase.co' &&
           supabaseAnonKey !== 'votre_cle_anon_supabase')
}

