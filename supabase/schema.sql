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

