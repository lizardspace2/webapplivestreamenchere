# 🔧 Guide pour corriger les problèmes RLS

## Problème

Les requêtes vers la table `profiles` timeout ou échouent à cause des politiques RLS (Row Level Security) qui bloquent l'accès.

## Solution rapide

### Option 1 : Désactiver RLS temporairement (recommandé pour tester)

1. Ouvrez votre **dashboard Supabase**
2. Allez dans **SQL Editor** (menu de gauche)
3. Ouvrez le fichier `supabase/fix_profiles_rls.sql` dans votre éditeur
4. **Copiez tout le contenu** du fichier
5. **Collez-le** dans l'éditeur SQL de Supabase
6. Cliquez sur **"Run"** (ou appuyez sur `Ctrl+Enter`)
7. ✅ RLS est maintenant désactivé sur la table `profiles`

### Option 2 : Recréer toute la base de données (si vous n'avez pas de données importantes)

1. Ouvrez votre **dashboard Supabase**
2. Allez dans **SQL Editor**
3. Ouvrez le fichier `supabase/setup_complete.sql`
4. **Copiez tout le contenu** du fichier
5. **Collez-le** dans l'éditeur SQL de Supabase
6. Cliquez sur **"Run"**
7. ✅ Toutes les tables sont créées sans RLS

### Option 3 : Désactiver RLS sur toutes les tables

1. Ouvrez votre **dashboard Supabase**
2. Allez dans **SQL Editor**
3. Ouvrez le fichier `supabase/disable_all_rls.sql`
4. **Copiez tout le contenu** du fichier
5. **Collez-le** dans l'éditeur SQL de Supabase
6. Cliquez sur **"Run"**
7. ✅ RLS est désactivé sur toutes les tables

## Vérification

Après avoir exécuté l'un des scripts :

1. Rechargez votre application
2. Essayez de vous connecter
3. Essayez d'enregistrer votre profil
4. Les requêtes devraient maintenant fonctionner sans timeout

## Notes importantes

- ⚠️ **Désactiver RLS** signifie que toutes les données sont accessibles sans restrictions
- 🔒 Pour la production, vous devrez réactiver RLS avec des politiques appropriées
- 📝 Les scripts sont idempotents (vous pouvez les exécuter plusieurs fois sans problème)

## Réactiver RLS plus tard

Si vous voulez réactiver RLS avec des politiques simples, décommentez les lignes dans `supabase/fix_profiles_rls.sql` après avoir testé.


