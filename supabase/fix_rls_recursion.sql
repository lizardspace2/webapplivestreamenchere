-- ============================================
-- SQL pour corriger la récursion infinie dans les politiques RLS
-- ============================================
-- Instructions:
-- 1. Ouvrez le SQL Editor dans votre dashboard Supabase
-- 2. Copiez-collez tout ce fichier
-- 3. Cliquez sur "Run" pour exécuter
-- ============================================

-- Supprimer la politique problématique qui cause la récursion
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;

-- Supprimer aussi la politique pour les salles d'enchères si elle cause des problèmes
DROP POLICY IF EXISTS "Admins can update auction rooms" ON auction_rooms;

-- Créer une fonction helper pour vérifier si un utilisateur est admin
-- Cette fonction évite la récursion en utilisant SECURITY DEFINER
CREATE OR REPLACE FUNCTION is_user_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$;

-- Politique simplifiée : les utilisateurs peuvent lire leur propre profil
-- (cette politique existe déjà, mais on s'assure qu'elle est correcte)
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Politique pour permettre aux admins de mettre à jour les salles d'enchères
-- En utilisant la fonction helper pour éviter la récursion
CREATE POLICY "Admins can update auction rooms" ON auction_rooms
  FOR UPDATE
  USING (is_user_admin(auth.uid()))
  WITH CHECK (is_user_admin(auth.uid()));

-- ============================================
-- ✅ Correction terminée!
-- La récursion infinie est maintenant résolue.
-- ============================================

