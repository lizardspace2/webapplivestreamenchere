# 🚀 Guide de déploiement

## Déploiement sur Vercel + Supabase

### Étape 1: Configuration Supabase

1. **Créer un projet Supabase**
   - Allez sur [supabase.com](https://supabase.com)
   - Créez un nouveau projet
   - Notez votre URL et votre clé anon (Settings > API)

2. **Créer les tables**
   - Allez dans **SQL Editor** dans votre dashboard Supabase
   - Copiez-collez le contenu de `supabase/schema.sql`
   - Exécutez le script

3. **Activer Realtime**
   - Allez dans **Settings > API**
   - Vérifiez que **Realtime** est activé
   - Activez Realtime pour la table `bids` si nécessaire

4. **Configurer l'authentification**
   - Allez dans **Authentication > Settings**
   - Configurez les providers (Email est activé par défaut)
   - Configurez les emails de confirmation si nécessaire

### Étape 2: Configuration Vercel

#### Option A: Via GitHub (Recommandé)

1. **Pousser le code sur GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/votre-username/votre-repo.git
   git push -u origin main
   ```

2. **Importer sur Vercel**
   - Allez sur [vercel.com](https://vercel.com)
   - Cliquez sur **Add New Project**
   - Importez votre repository GitHub
   - Vercel détectera automatiquement Next.js

3. **Ajouter les variables d'environnement**
   Dans les paramètres du projet Vercel, ajoutez :
   ```
   NEXT_PUBLIC_SUPABASE_URL=votre_url_supabase
   NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon
   NEXT_PUBLIC_LIVEPEER_STREAM_ID=fd1fc93e-0f0d-4084-856a-29c57dc19f37
   NEXT_PUBLIC_LIVEPEER_PLAYBACK_ID=fd1fae44jz9ehoud
   NEXT_PUBLIC_LIVEPEER_PLAYBACK_URL=https://livepeercdn.studio/hls/fd1fae44jz9ehoud/index.m3u8
   ```

4. **Déployer**
   - Cliquez sur **Deploy**
   - Attendez la fin du déploiement
   - Votre app est en ligne !

#### Option B: Via Vercel CLI

```bash
# Installer Vercel CLI
npm i -g vercel

# Se connecter
vercel login

# Déployer
vercel

# Ajouter les variables d'environnement
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# ... etc

# Redéployer avec les nouvelles variables
vercel --prod
```

### Étape 3: Configuration Livepeer (Optionnel pour diffuser)

Si vous voulez diffuser vous-même :

1. **Créer un compte Livepeer**
   - Allez sur [livepeer.com](https://livepeer.com)
   - Créez un compte

2. **Récupérer votre API Key**
   - Allez dans votre dashboard
   - Créez une API key
   - Ajoutez-la comme variable d'environnement `LIVEPEER_API_KEY` (côté serveur uniquement)

3. **Créer un stream**
   - Créez un nouveau stream dans Livepeer
   - Utilisez les credentials fournis dans le code ou créez-en de nouveaux
   - Mettez à jour les variables d'environnement si nécessaire

### Étape 4: Tester

1. Visitez votre URL Vercel
2. Créez un compte
3. Vérifiez votre email (si confirmation activée)
4. Connectez-vous
5. Testez une enchère

## 🔧 Configuration avancée

### Multi-streaming

Pour diffuser vers plusieurs plateformes simultanément :
- Configurez les **Multistream Targets** dans Livepeer
- Ajoutez YouTube, Twitch, Facebook, etc.

### Enregistrement des sessions

- Activez **Record sessions** dans Livepeer
- Les vidéos seront enregistrées automatiquement

### Faible latence

Pour une latence encore plus faible :
- Utilisez WebRTC au lieu de HLS (nécessite une configuration supplémentaire)
- Ou utilisez le mode low-latency de Livepeer

## 📊 Monitoring

- **Vercel Analytics** : Activez dans les paramètres du projet
- **Supabase Dashboard** : Surveillez les requêtes et l'utilisation
- **Livepeer Dashboard** : Surveillez la qualité du stream

## 🐛 Problèmes courants

### Le déploiement échoue
- Vérifiez que toutes les variables d'environnement sont définies
- Vérifiez les logs de build dans Vercel

### Les enchères ne fonctionnent pas
- Vérifiez que Realtime est activé dans Supabase
- Vérifiez les politiques RLS
- Vérifiez la console du navigateur pour les erreurs

### La vidéo ne charge pas
- Vérifiez que le stream est actif sur Livepeer
- Vérifiez l'URL de playback
- Vérifiez la console pour les erreurs HLS

