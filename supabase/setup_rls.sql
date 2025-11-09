-- Script complet pour configurer RLS sur toutes les tables
-- À exécuter dans le SQL Editor de votre dashboard Supabase

-- ============================================
-- TABLE: profiles
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Politique SELECT : Les utilisateurs peuvent voir leur propre profil
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- Politique INSERT : Les utilisateurs peuvent créer leur propre profil
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Politique UPDATE : Les utilisateurs peuvent mettre à jour leur propre profil
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- ============================================
-- TABLE: auction_rooms
-- ============================================
ALTER TABLE public.auction_rooms ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Anyone can view active auction rooms" ON public.auction_rooms;
DROP POLICY IF EXISTS "Admins can manage auction rooms" ON public.auction_rooms;

-- Politique SELECT : Tout le monde peut voir les salles d'enchères actives
CREATE POLICY "Anyone can view active auction rooms"
ON public.auction_rooms
FOR SELECT
USING (true);

-- Politique INSERT/UPDATE/DELETE : Seuls les admins peuvent gérer les salles
CREATE POLICY "Admins can manage auction rooms"
ON public.auction_rooms
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================
-- TABLE: bids
-- ============================================
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "Anyone can view bids" ON public.bids;
DROP POLICY IF EXISTS "Authenticated users can create bids" ON public.bids;

-- Politique SELECT : Tout le monde peut voir les enchères
CREATE POLICY "Anyone can view bids"
ON public.bids
FOR SELECT
USING (true);

-- Politique INSERT : Les utilisateurs authentifiés peuvent créer des enchères
CREATE POLICY "Authenticated users can create bids"
ON public.bids
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Vérification : Afficher toutes les politiques créées
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;

