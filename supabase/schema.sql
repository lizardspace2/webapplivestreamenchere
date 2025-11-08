-- Table pour les enchères
CREATE TABLE IF NOT EXISTS bids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room TEXT NOT NULL,
  bidder TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  inserted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  user_email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_bids_room ON bids(room);
CREATE INDEX IF NOT EXISTS idx_bids_inserted_at ON bids(inserted_at DESC);
CREATE INDEX IF NOT EXISTS idx_bids_amount ON bids(amount DESC);

-- Table pour les salles d'enchères (optionnel)
CREATE TABLE IF NOT EXISTS auction_rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  starting_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  min_increment DECIMAL(10, 2) NOT NULL DEFAULT 1,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'ended')),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS (Row Level Security) - Politique pour permettre la lecture à tous
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_rooms ENABLE ROW LEVEL SECURITY;

-- Politique: Tout le monde peut lire les enchères
CREATE POLICY "Anyone can read bids" ON bids
  FOR SELECT
  USING (true);

-- Politique: Seuls les utilisateurs authentifiés peuvent insérer des enchères
CREATE POLICY "Authenticated users can insert bids" ON bids
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Politique: Tout le monde peut lire les salles d'enchères
CREATE POLICY "Anyone can read auction rooms" ON auction_rooms
  FOR SELECT
  USING (true);

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour updated_at
CREATE TRIGGER update_auction_rooms_updated_at
  BEFORE UPDATE ON auction_rooms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);

-- RLS pour les profils
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Politique: Les utilisateurs peuvent lire leur propre profil
CREATE POLICY "Users can read own profile" ON profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Politique: Les utilisateurs peuvent insérer leur propre profil
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Politique: Les utilisateurs peuvent mettre à jour leur propre profil
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

