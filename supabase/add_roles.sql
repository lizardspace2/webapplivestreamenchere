-- ============================================
-- SQL pour ajouter le système de rôles
-- ============================================
-- Instructions:
-- 1. Ouvrez le SQL Editor dans votre dashboard Supabase
-- 2. Copiez-collez tout ce fichier
-- 3. Cliquez sur "Run" pour exécuter
-- ============================================

-- Ajouter la colonne role à la table profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'participant' CHECK (role IN ('admin', 'participant'));

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Mettre à jour les politiques RLS pour permettre aux admins de lire tous les profils
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
CREATE POLICY "Admins can read all profiles" ON profiles
  FOR SELECT
  USING (
    auth.uid() = id OR 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Politique pour permettre aux admins de mettre à jour les salles d'enchères
DROP POLICY IF EXISTS "Admins can update auction rooms" ON auction_rooms;
CREATE POLICY "Admins can update auction rooms" ON auction_rooms
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- ✅ Migration terminée!
-- Le système de rôles est maintenant configuré.
-- ============================================
-- Note: Pour définir un utilisateur comme admin, exécutez:
-- UPDATE profiles SET role = 'admin' WHERE id = 'user-uuid-here';
-- ============================================

