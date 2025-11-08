# 🚀 Guide de déploiement complet - Enchères Live Stream

Guide étape par étape pour déployer votre application d'enchères en direct sur Vercel avec Supabase.

---

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Étape 1 : Configuration Supabase](#étape-1--configuration-supabase)
3. [Étape 2 : Configuration des variables d'environnement](#étape-2--configuration-des-variables-denvironnement)
4. [Étape 3 : Déploiement sur Vercel](#étape-3--déploiement-sur-vercel)
5. [Étape 4 : Configuration Livepeer (optionnel)](#étape-4--configuration-livepeer-optionnel)
6. [Étape 5 : Tests et vérifications](#étape-5--tests-et-vérifications)
7. [Dépannage](#dépannage)

---

## 📦 Prérequis

Avant de commencer, assurez-vous d'avoir :

- ✅ Un compte [GitHub](https://github.com) (déjà fait ✅)
- ✅ Un compte [Vercel](https://vercel.com) (gratuit)
- ✅ Un compte [Supabase](https://supabase.com) (gratuit)
- ✅ Un compte [Livepeer](https://livepeer.com) (optionnel, pour diffuser)

---

## 🔧 Étape 1 : Configuration Supabase

### 1.1 Créer un projet Supabase

1. Allez sur [https://supabase.com](https://supabase.com)
2. Cliquez sur **"Start your project"** ou **"New Project"**
3. Connectez-vous avec GitHub (recommandé)
4. Cliquez sur **"New Project"**
5. Remplissez le formulaire :
   - **Name** : `live-auction-app` (ou votre choix)
   - **Database Password** : Choisissez un mot de passe fort (⚠️ **SAVEZ-LE** quelque part)
   - **Region** : Choisissez la région la plus proche (ex: `West Europe` pour la France)
6. Cliquez sur **"Create new project"**
7. ⏳ Attendez 2-3 minutes que le projet soit créé

### 1.2 Créer les tables de base de données

1. Dans votre dashboard Supabase, allez dans **SQL Editor** (menu de gauche)
2. Cliquez sur **"New query"**
3. Ouvrez le fichier `supabase/schema.sql` de ce projet
4. **Copiez tout le contenu** du fichier
5. **Collez-le** dans l'éditeur SQL de Supabase
6. Cliquez sur **"Run"** (ou appuyez sur `Ctrl+Enter`)
7. ✅ Vous devriez voir "Success. No rows returned"

### 1.3 Activer Realtime

1. Allez dans **Settings** > **API** (menu de gauche)
2. Vérifiez que **Realtime** est activé
3. Si ce n'est pas le cas, allez dans **Database** > **Replication**
4. Activez la réplication pour la table `bids`

### 1.4 Récupérer les credentials Supabase

1. Toujours dans **Settings** > **API**
2. Vous verrez deux informations importantes :
   - **Project URL** : `https://xxxxx.supabase.co`
   - **anon public key** : Une longue chaîne de caractères
3. **Copiez ces deux valeurs** - vous en aurez besoin pour Vercel

### 1.5 Configurer l'authentification (optionnel mais recommandé)

1. Allez dans **Authentication** > **Settings**
2. Vérifiez que **"Enable email signup"** est activé
3. Configurez les emails de confirmation si vous le souhaitez :
   - **Enable email confirmations** : Activé (recommandé pour la sécurité)
   - Ou désactivé pour les tests rapides

---

## 🔐 Étape 2 : Configuration des variables d'environnement

### 2.1 Variables nécessaires

Vous aurez besoin de ces variables d'environnement :

```env
# Supabase (OBLIGATOIRE)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=votre_cle_anon_supabase

# Livepeer (déjà configuré, mais vous pouvez les modifier)
NEXT_PUBLIC_LIVEPEER_STREAM_ID=fd1fc93e-0f0d-4084-856a-29c57dc19f37
NEXT_PUBLIC_LIVEPEER_PLAYBACK_ID=fd1fae44jz9ehoud
NEXT_PUBLIC_LIVEPEER_PLAYBACK_URL=https://livepeercdn.studio/hls/fd1fae44jz9ehoud/index.m3u8

# Livepeer API Key (optionnel, seulement si vous voulez diffuser)
LIVEPEER_API_KEY=votre_cle_api_livepeer
```

### 2.2 Pour le développement local (optionnel)

Si vous voulez tester en local avant de déployer :

1. Créez un fichier `.env.local` à la racine du projet
2. Ajoutez les variables ci-dessus
3. Lancez `npm run dev`

⚠️ **Ne commitez JAMAIS** le fichier `.env.local` (il est déjà dans `.gitignore`)

---

## 🚀 Étape 3 : Déploiement sur Vercel

### 3.1 Créer un compte Vercel

1. Allez sur [https://vercel.com](https://vercel.com)
2. Cliquez sur **"Sign Up"**
3. Choisissez **"Continue with GitHub"** (recommandé)
4. Autorisez Vercel à accéder à vos repositories

### 3.2 Importer votre projet

1. Dans le dashboard Vercel, cliquez sur **"Add New..."** > **"Project"**
2. Vous verrez la liste de vos repositories GitHub
3. Trouvez **`lizardspace2/webapplivestreamenchere`**
4. Cliquez sur **"Import"**

### 3.3 Configurer le projet

1. **Framework Preset** : Vercel détectera automatiquement Next.js ✅
2. **Root Directory** : Laissez vide (ou `./` si demandé)
3. **Build Command** : `npm run build` (déjà configuré)
4. **Output Directory** : `.next` (déjà configuré)
5. **Install Command** : `npm install` (déjà configuré)

### 3.4 Ajouter les variables d'environnement

**⚠️ IMPORTANT : C'est ici que vous ajoutez vos credentials Supabase !**

1. Dans la section **"Environment Variables"**, cliquez sur **"Add"**
2. Ajoutez chaque variable une par une :

   **Variable 1 :**
   - **Name** : `NEXT_PUBLIC_SUPABASE_URL`
   - **Value** : Votre Project URL de Supabase (ex: `https://xxxxx.supabase.co`)
   - **Environment** : Cochez toutes les cases (Production, Preview, Development)

   **Variable 2 :**
   - **Name** : `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **Value** : Votre anon public key de Supabase
   - **Environment** : Cochez toutes les cases

   **Variable 3 :**
   - **Name** : `NEXT_PUBLIC_LIVEPEER_STREAM_ID`
   - **Value** : `fd1fc93e-0f0d-4084-856a-29c57dc19f37`
   - **Environment** : Cochez toutes les cases

   **Variable 4 :**
   - **Name** : `NEXT_PUBLIC_LIVEPEER_PLAYBACK_ID`
   - **Value** : `fd1fae44jz9ehoud`
   - **Environment** : Cochez toutes les cases

   **Variable 5 :**
   - **Name** : `NEXT_PUBLIC_LIVEPEER_PLAYBACK_URL`
   - **Value** : `https://livepeercdn.studio/hls/fd1fae44jz9ehoud/index.m3u8`
   - **Environment** : Cochez toutes les cases

3. Cliquez sur **"Save"** après chaque variable

### 3.5 Déployer

1. Vérifiez que toutes les variables sont ajoutées
2. Cliquez sur **"Deploy"**
3. ⏳ Attendez 2-3 minutes que le déploiement se termine
4. ✅ Vous verrez "Congratulations! Your project has been deployed"

### 3.6 Accéder à votre application

1. Vercel vous donnera une URL : `https://votre-projet.vercel.app`
2. Cliquez sur l'URL pour ouvrir votre application
3. 🎉 Votre app est en ligne !

### 3.7 Configuration du domaine personnalisé (optionnel)

1. Dans les paramètres du projet Vercel, allez dans **"Domains"**
2. Ajoutez votre domaine personnalisé
3. Suivez les instructions pour configurer les DNS

---

## 🎥 Étape 4 : Configuration Livepeer (optionnel)

### 4.1 Si vous voulez utiliser votre propre stream Livepeer

1. Allez sur [https://livepeer.com](https://livepeer.com)
2. Créez un compte
3. Créez un nouveau **Stream**
4. Récupérez :
   - **Stream ID**
   - **Playback ID**
   - **Playback URL**
5. Mettez à jour les variables d'environnement dans Vercel avec vos nouvelles valeurs
6. Redéployez (Vercel le fera automatiquement)

### 4.2 Pour diffuser (broadcasting)

Si vous voulez diffuser vous-même :

1. Dans Livepeer, créez une **API Key**
2. Ajoutez-la comme variable d'environnement `LIVEPEER_API_KEY` dans Vercel
3. Utilisez l'URL de broadcast fournie par Livepeer

---

## ✅ Étape 5 : Tests et vérifications

### 5.1 Tests de base

1. **Ouvrez votre application** : `https://votre-projet.vercel.app`
2. **Vérifiez que la vidéo charge** : Le player vidéo devrait apparaître
3. **Testez l'inscription** :
   - Cliquez sur "Créer un compte"
   - Entrez un email et un mot de passe
   - Vérifiez votre email (si confirmation activée)
4. **Testez la connexion** : Connectez-vous avec vos identifiants
5. **Testez une enchère** :
   - Entrez un montant (ex: 15 €)
   - Cliquez sur "Enchérir"
   - Vérifiez que l'enchère apparaît dans l'historique

### 5.2 Vérifications techniques

1. **Console du navigateur** :
   - Ouvrez les DevTools (F12)
   - Onglet "Console"
   - Vérifiez qu'il n'y a pas d'erreurs rouges

2. **Network** :
   - Onglet "Network" des DevTools
   - Vérifiez que les requêtes vers Supabase fonctionnent

3. **Realtime** :
   - Ouvrez l'app dans deux onglets différents
   - Placez une enchère dans un onglet
   - Vérifiez qu'elle apparaît instantanément dans l'autre onglet

### 5.3 Vérifications Supabase

1. Allez dans votre dashboard Supabase
2. **Table Editor** > **bids**
3. Vérifiez que vos enchères sont enregistrées
4. **Authentication** > **Users**
5. Vérifiez que vos utilisateurs sont créés

---

## 🔄 Déploiements automatiques

Vercel déploie automatiquement à chaque push sur GitHub :

1. **Push sur `main`** → Déploiement en production
2. **Pull Request** → Déploiement de preview
3. **Branche** → Déploiement de preview

Vous n'avez rien à faire, c'est automatique ! 🎉

---

## 🐛 Dépannage

### Problème : "Missing Supabase environment variables"

**Solution :**
- Vérifiez que toutes les variables sont ajoutées dans Vercel
- Vérifiez l'orthographe exacte des noms de variables
- Redéployez après avoir ajouté les variables

### Problème : La vidéo ne charge pas

**Solutions :**
- Vérifiez que le stream Livepeer est actif
- Vérifiez la console du navigateur pour les erreurs HLS
- Vérifiez que l'URL de playback est correcte

### Problème : Les enchères ne s'affichent pas en temps réel

**Solutions :**
- Vérifiez que Realtime est activé dans Supabase
- Vérifiez les politiques RLS (Row Level Security)
- Vérifiez la console pour les erreurs de connexion

### Problème : Erreur d'authentification

**Solutions :**
- Vérifiez que les variables Supabase sont correctes
- Vérifiez que l'email est confirmé (si confirmation activée)
- Vérifiez les logs Supabase dans le dashboard

### Problème : Le build échoue sur Vercel

**Solutions :**
- Vérifiez les logs de build dans Vercel
- Vérifiez que toutes les dépendances sont dans `package.json`
- Vérifiez qu'il n'y a pas d'erreurs TypeScript

### Problème : Les variables d'environnement ne sont pas prises en compte

**Solutions :**
- Redéployez après avoir ajouté/modifié les variables
- Vérifiez que les variables commencent par `NEXT_PUBLIC_` si elles doivent être accessibles côté client
- Vérifiez que vous avez coché les bonnes environnements (Production, Preview, Development)

---

## 📊 Monitoring et Analytics

### Vercel Analytics

1. Dans les paramètres du projet Vercel
2. Activez **"Analytics"**
3. Surveillez les performances de votre app

### Supabase Dashboard

1. Surveillez les **requêtes** dans le dashboard
2. Surveillez l'**utilisation** de la base de données
3. Surveillez les **utilisateurs** actifs

### Logs

- **Vercel Logs** : Disponibles dans le dashboard Vercel
- **Supabase Logs** : Disponibles dans le dashboard Supabase

---

## 🔒 Sécurité

### Bonnes pratiques

1. ✅ **Ne commitez JAMAIS** les variables d'environnement
2. ✅ Utilisez des mots de passe forts pour Supabase
3. ✅ Activez la confirmation d'email pour l'authentification
4. ✅ Surveillez les logs pour détecter les abus
5. ✅ Utilisez HTTPS (automatique avec Vercel)

### Row Level Security (RLS)

Les politiques RLS sont déjà configurées dans `supabase/schema.sql` :
- ✅ Lecture publique des enchères
- ✅ Seuls les utilisateurs authentifiés peuvent placer des enchères

---

## 🎯 Prochaines étapes

Une fois déployé, vous pouvez :

1. **Personnaliser l'interface** : Modifiez les styles dans `app/page.tsx`
2. **Ajouter des fonctionnalités** :
   - Système de paiement (Stripe)
   - Notifications en temps réel
   - Historique des enchères
   - Multi-salles d'enchères
3. **Optimiser les performances** :
   - Cache des données
   - Optimisation des images
   - CDN pour les assets

---

## 📞 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs dans Vercel et Supabase
2. Consultez la documentation :
   - [Next.js](https://nextjs.org/docs)
   - [Supabase](https://supabase.com/docs)
   - [Vercel](https://vercel.com/docs)
   - [Livepeer](https://livepeer.com/docs)

---

## ✅ Checklist de déploiement

- [ ] Projet Supabase créé
- [ ] Tables créées (schema.sql exécuté)
- [ ] Realtime activé
- [ ] Credentials Supabase récupérés
- [ ] Variables d'environnement ajoutées dans Vercel
- [ ] Projet déployé sur Vercel
- [ ] Application accessible en ligne
- [ ] Tests d'inscription/connexion réussis
- [ ] Tests d'enchères réussis
- [ ] Realtime fonctionne (test avec 2 onglets)

---

**🎉 Félicitations ! Votre application d'enchères en direct est maintenant déployée !**

