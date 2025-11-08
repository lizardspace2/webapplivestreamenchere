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

// Créer le client Supabase uniquement si les credentials sont valides
// Sinon, créer un client avec des valeurs vides qui échouera proprement
export const supabase = createClient(
  supabaseUrl || 'https://invalid.supabase.co',
  supabaseAnonKey || 'invalid-key'
)

// Fonction helper pour vérifier si Supabase est configuré
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && 
           supabaseUrl !== 'https://votre-projet.supabase.co' &&
           supabaseAnonKey !== 'votre_cle_anon_supabase')
}

