-- ============================================
-- SQL pour DÉSACTIVER TOUTES les politiques RLS
-- ============================================
-- Instructions:
-- 1. Ouvrez le SQL Editor dans votre dashboard Supabase
-- 2. Copiez-collez tout ce fichier
-- 3. Cliquez sur "Run" pour exécuter
-- ============================================

-- ============================================
-- 1. Supprimer TOUTES les politiques RLS de la table profiles
-- ============================================
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can upsert own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can edit own profile" ON profiles;

-- Supprimer toutes les autres politiques possibles (au cas où)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON profiles';
    END LOOP;
END $$;

-- ============================================
-- 2. Supprimer TOUTES les politiques RLS de la table bids
-- ============================================
DROP POLICY IF EXISTS "Anyone can read bids" ON bids;
DROP POLICY IF EXISTS "Authenticated users can insert bids" ON bids;
DROP POLICY IF EXISTS "Users can insert bids" ON bids;
DROP POLICY IF EXISTS "Public bids are viewable by everyone" ON bids;
DROP POLICY IF EXISTS "Authenticated users can create bids" ON bids;

-- Supprimer toutes les autres politiques possibles
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'bids') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON bids';
    END LOOP;
END $$;

-- ============================================
-- 3. Supprimer TOUTES les politiques RLS de la table auction_rooms
-- ============================================
DROP POLICY IF EXISTS "Anyone can read auction rooms" ON auction_rooms;
DROP POLICY IF EXISTS "Admins can update auction rooms" ON auction_rooms;
DROP POLICY IF EXISTS "Public auction rooms are viewable by everyone" ON auction_rooms;
DROP POLICY IF EXISTS "Authenticated users can read auction rooms" ON auction_rooms;
DROP POLICY IF EXISTS "Admins can manage auction rooms" ON auction_rooms;

-- Supprimer toutes les autres politiques possibles
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'auction_rooms') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON auction_rooms';
    END LOOP;
END $$;

-- ============================================
-- 4. DÉSACTIVER RLS sur toutes les tables
-- ============================================
ALTER TABLE IF EXISTS profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bids DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS auction_rooms DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 5. Supprimer les fonctions helper liées aux RLS
-- ============================================
DROP FUNCTION IF EXISTS is_user_admin(UUID);
DROP FUNCTION IF EXISTS is_user_admin(UUID, TEXT);

-- ============================================
-- 6. Vérifier et supprimer toutes les autres politiques RLS
-- ============================================
-- Supprimer toutes les politiques RLS restantes sur toutes les tables publiques
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    ) LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- ============================================
-- ✅ TOUTES les politiques RLS ont été supprimées!
-- ✅ RLS est désactivé sur toutes les tables!
-- ============================================
-- Les tables sont maintenant accessibles sans restrictions RLS.
-- Vous pouvez maintenant tester votre application.
-- ============================================
