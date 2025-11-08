-- ============================================
-- Script SQL complet pour configurer la base de données
-- ============================================
-- Instructions:
-- 1. Ouvrez le SQL Editor dans votre dashboard Supabase
-- 2. Copiez-collez tout ce fichier
-- 3. Cliquez sur "Run" pour exécuter
-- ============================================

-- ============================================
-- 1. Créer les tables
-- ============================================

-- Table pour les salles d'enchères
CREATE TABLE IF NOT EXISTS auction_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  starting_price NUMERIC NOT NULL DEFAULT 0,
  min_increment NUMERIC NOT NULL DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les enchères
CREATE TABLE IF NOT EXISTS bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room TEXT NOT NULL,
  bidder TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  inserted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les profils utilisateurs
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  address TEXT,
  postal_code TEXT,
  city TEXT,
  country TEXT DEFAULT 'France',
  additional_info TEXT,
  phone_country_code TEXT DEFAULT '+33',
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  role TEXT DEFAULT 'participant' CHECK (role IN ('admin', 'participant'))
);

-- ============================================
-- 2. Créer les index
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_bids_room ON bids(room);
CREATE INDEX IF NOT EXISTS idx_bids_inserted_at ON bids(inserted_at);

-- ============================================
-- 3. Créer les fonctions
-- ============================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at sur profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 4. Configurer RLS (Row Level Security)
-- ============================================

-- Désactiver RLS temporairement pour permettre les tests
-- Vous pouvez réactiver RLS plus tard avec des politiques appropriées

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can read bids" ON bids;
DROP POLICY IF EXISTS "Authenticated users can insert bids" ON bids;
DROP POLICY IF EXISTS "Anyone can read auction rooms" ON auction_rooms;
DROP POLICY IF EXISTS "Admins can update auction rooms" ON auction_rooms;

-- Désactiver RLS sur toutes les tables (pour permettre les tests)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE bids DISABLE ROW LEVEL SECURITY;
ALTER TABLE auction_rooms DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. Activer Realtime (optionnel, pour les notifications)
-- ============================================

-- Note: L'activation de Realtime se fait via l'interface Supabase
-- Allez dans Database > Replication et activez pour la table 'bids'

-- ============================================
-- ✅ Configuration terminée!
-- ============================================
-- Les tables sont créées et RLS est désactivé pour permettre les tests.
-- 
-- Pour réactiver RLS plus tard, exécutez:
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- Puis créez les politiques appropriées.
-- ============================================

