# 🎥 Enchères Live Stream

Application web d'enchères en direct avec streaming vidéo en temps réel, authentification Supabase et déploiement Vercel.

## ✨ Fonctionnalités

- 📹 **Live Streaming** avec Livepeer (faible latence, HLS)
- 💰 **Système d'enchères en temps réel** avec offres croissantes
- 🔐 **Authentification** complète avec Supabase
- ⚡ **Temps réel** via Supabase Realtime
- 🎨 **Interface moderne** avec Tailwind CSS
- 🚀 **Déploiement facile** sur Vercel

## 🚀 Déploiement rapide

### 1. Prérequis

- Compte [Vercel](https://vercel.com)
- Compte [Supabase](https://supabase.com)
- Compte [Livepeer](https://livepeer.com) (optionnel pour diffuser)

### 2. Configuration Supabase

1. Créez un nouveau projet sur [Supabase](https://supabase.com)
2. Allez dans **SQL Editor** et exécutez le contenu de `supabase/schema.sql`
3. Récupérez votre **URL** et **anon key** dans Settings > API

### 3. Configuration Livepeer

Les credentials Livepeer sont déjà configurés dans le code :
- Stream ID: `fd1fc93e-0f0d-4084-856a-29c57dc19f37`
- Playback ID: `fd1fae44jz9ehoud`
- Playback URL: `https://livepeercdn.studio/hls/fd1fae44jz9ehoud/index.m3u8`

Pour diffuser (optionnel), vous aurez besoin d'une clé API Livepeer.

### 4. Configuration des variables d'environnement

Créez un fichier `.env.local` à la racine du projet :

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_supabase

# Livepeer (déjà configuré, optionnel de changer)
NEXT_PUBLIC_LIVEPEER_STREAM_ID=fd1fc93e-0f0d-4084-856a-29c57dc19f37
NEXT_PUBLIC_LIVEPEER_PLAYBACK_ID=fd1fae44jz9ehoud
NEXT_PUBLIC_LIVEPEER_PLAYBACK_URL=https://livepeercdn.studio/hls/fd1fae44jz9ehoud/index.m3u8

# Optionnel: Pour diffuser
LIVEPEER_API_KEY=votre_cle_api_livepeer
```

### 5. Installation locale

```bash
# Installer les dépendances
npm install

# Lancer en développement
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000)

### 6. Déploiement sur Vercel

#### Option A: Via l'interface Vercel

1. Poussez votre code sur GitHub
2. Allez sur [Vercel](https://vercel.com)
3. Importez votre repository
4. Ajoutez les variables d'environnement dans les paramètres du projet
5. Déployez !

#### Option B: Via CLI

```bash
# Installer Vercel CLI
npm i -g vercel

# Déployer
vercel

# Suivre les instructions et ajouter les variables d'environnement
```

## 📊 Structure de la base de données

### Table `bids`
- `id`: UUID (clé primaire)
- `room`: TEXT (identifiant de la salle d'enchères)
- `bidder`: TEXT (email de l'enchérisseur)
- `amount`: DECIMAL (montant de l'enchère)
- `inserted_at`: TIMESTAMPTZ (date d'insertion)

### Table `auction_rooms` (optionnel)
- Gestion des salles d'enchères multiples
- Prix de départ, incrément minimum, statut, etc.

## 🔒 Sécurité

- **Row Level Security (RLS)** activé sur Supabase
- Seuls les utilisateurs authentifiés peuvent placer des enchères
- Tous les utilisateurs peuvent voir les enchères (lecture publique)

## 🎯 Utilisation

1. **Créer un compte** : Cliquez sur "Créer un compte" et vérifiez votre email
2. **Se connecter** : Utilisez vos identifiants pour vous connecter
3. **Regarder le stream** : La vidéo se charge automatiquement
4. **Placer une enchère** : Entrez un montant supérieur au prix actuel + incrément minimum
5. **Suivre en temps réel** : Les enchères apparaissent instantanément pour tous les utilisateurs

## 🛠️ Technologies utilisées

- **Next.js 14** - Framework React
- **TypeScript** - Typage statique
- **Tailwind CSS** - Styling
- **Supabase** - Backend (Auth + Database + Realtime)
- **Livepeer** - Streaming vidéo
- **HLS.js** - Lecture HLS dans le navigateur
- **Vercel** - Hébergement

## 📝 Notes importantes

- Pour une **latence très faible**, considérez WebRTC au lieu de HLS
- Pour les **paiements**, intégrez Stripe après la fin de l'enchère
- Pour la **multi-diffusion**, configurez les targets dans Livepeer
- Les **sessions** peuvent être enregistrées via Livepeer

## 🐛 Dépannage

### La vidéo ne charge pas
- Vérifiez que l'URL Livepeer est correcte
- Vérifiez la console du navigateur pour les erreurs HLS
- Assurez-vous que le stream est actif sur Livepeer

### Les enchères ne s'affichent pas en temps réel
- Vérifiez que Realtime est activé dans Supabase (Settings > API > Realtime)
- Vérifiez que les politiques RLS sont correctement configurées
- Vérifiez la connexion dans l'interface (indicateur vert/rouge)

### Erreur d'authentification
- Vérifiez vos variables d'environnement Supabase
- Vérifiez que l'email est confirmé (vérifiez vos spams)

## 📄 Licence

MIT

