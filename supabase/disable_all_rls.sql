-- ============================================
-- SQL pour désactiver toutes les politiques RLS
-- ============================================
-- Instructions:
-- 1. Ouvrez le SQL Editor dans votre dashboard Supabase
-- 2. Copiez-collez tout ce fichier
-- 3. Cliquez sur "Run" pour exécuter
-- ============================================

-- Supprimer toutes les politiques RLS de la table profiles
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;

-- Supprimer toutes les politiques RLS de la table bids
DROP POLICY IF EXISTS "Anyone can read bids" ON bids;
DROP POLICY IF EXISTS "Authenticated users can insert bids" ON bids;

-- Supprimer toutes les politiques RLS de la table auction_rooms
DROP POLICY IF EXISTS "Anyone can read auction rooms" ON auction_rooms;
DROP POLICY IF EXISTS "Admins can update auction rooms" ON auction_rooms;

-- Désactiver RLS sur toutes les tables
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE bids DISABLE ROW LEVEL SECURITY;
ALTER TABLE auction_rooms DISABLE ROW LEVEL SECURITY;

-- Supprimer la fonction helper si elle existe
DROP FUNCTION IF EXISTS is_user_admin(UUID);

-- ============================================
-- ✅ Toutes les politiques RLS ont été supprimées!
-- Les tables sont maintenant accessibles sans restrictions RLS.
-- ============================================

