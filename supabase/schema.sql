-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.auction_rooms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  starting_price numeric NOT NULL DEFAULT 0,
  min_increment numeric NOT NULL DEFAULT 1,
  status text DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'paused'::text, 'ended'::text])),
  ends_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT auction_rooms_pkey PRIMARY KEY (id)
);
CREATE TABLE public.bids (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  room text NOT NULL,
  bidder text NOT NULL,
  amount numeric NOT NULL,
  inserted_at timestamp with time zone NOT NULL DEFAULT now(),
  user_email text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bids_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  first_name text,
  last_name text,
  address text,
  postal_code text,
  city text,
  country text DEFAULT 'France'::text,
  additional_info text,
  phone_country_code text DEFAULT '+33'::text,
  phone_number text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  role text DEFAULT 'participant'::text CHECK (role = ANY (ARRAY['admin'::text, 'participant'::text])),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);