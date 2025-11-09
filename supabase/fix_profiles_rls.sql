-- Script pour configurer les politiques RLS (Row Level Security) pour la table profiles
-- À exécuter dans le SQL Editor de votre dashboard Supabase

-- 1. Activer RLS sur la table profiles (si ce n'est pas déjà fait)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer les anciennes politiques s'elles existent (pour éviter les doublons)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- 3. Politique pour permettre aux utilisateurs de lire leur propre profil
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = id);

-- 4. Politique pour permettre aux utilisateurs de créer leur propre profil
CREATE POLICY "Users can insert their own profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = id);

-- 5. Politique pour permettre aux utilisateurs de mettre à jour leur propre profil
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- 6. (Optionnel) Si vous voulez permettre aux admins de voir tous les profils
-- Décommentez les lignes suivantes :
-- CREATE POLICY "Admins can view all profiles"
-- ON public.profiles
-- FOR SELECT
-- USING (
--   EXISTS (
--     SELECT 1 FROM public.profiles
--     WHERE id = auth.uid() AND role = 'admin'
--   )
-- );

-- Vérification : Les politiques suivantes devraient maintenant être actives :
-- SELECT * FROM pg_policies WHERE tablename = 'profiles';

