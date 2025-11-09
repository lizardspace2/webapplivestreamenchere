-- Script pour désactiver RLS (Row Level Security) sur toutes les tables
-- À exécuter dans le SQL Editor de votre dashboard Supabase

-- Désactiver RLS sur la table profiles
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- Désactiver RLS sur la table auction_rooms
ALTER TABLE public.auction_rooms DISABLE ROW LEVEL SECURITY;

-- Désactiver RLS sur la table bids
ALTER TABLE public.bids DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les politiques existantes (optionnel, mais recommandé pour nettoyer)
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can view active auction rooms" ON public.auction_rooms;
DROP POLICY IF EXISTS "Admins can manage auction rooms" ON public.auction_rooms;
DROP POLICY IF EXISTS "Anyone can view bids" ON public.bids;
DROP POLICY IF EXISTS "Authenticated users can create bids" ON public.bids;

-- Vérification : Vérifier que RLS est bien désactivé
-- SELECT tablename, rowsecurity 
-- FROM pg_tables 
-- WHERE schemaname = 'public' 
-- AND tablename IN ('profiles', 'auction_rooms', 'bids');

