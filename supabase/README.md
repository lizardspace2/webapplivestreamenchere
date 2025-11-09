# Configuration Supabase - Résolution des problèmes RLS

## Problème : Les données du profil ne se chargent pas / ne peuvent pas être modifiées

Si vous rencontrez des erreurs de permissions ou si les données du profil ne se chargent pas, c'est probablement dû à des politiques RLS (Row Level Security) manquantes ou mal configurées.

## Solutions disponibles

### Option A : Désactiver RLS (Recommandé pour le développement)

**⚠️ Attention :** Désactiver RLS supprime toute sécurité au niveau des lignes. Utilisez cette option uniquement en développement ou si vous avez une autre méthode de sécurité en place.

1. Ouvrez votre dashboard Supabase
2. Allez dans **SQL Editor**
3. Cliquez sur **New Query**
4. Copiez-collez le contenu du fichier `disable_rls.sql`
5. Cliquez sur **Run**

Cela désactivera RLS sur toutes les tables (profiles, auction_rooms, bids) et supprimera toutes les politiques existantes.

### Option B : Configurer les politiques RLS (Recommandé pour la production)

## Solution : Exécuter les scripts SQL

### Option 1 : Script rapide (profiles uniquement)

1. Ouvrez votre dashboard Supabase : https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **SQL Editor** (dans le menu de gauche)
4. Cliquez sur **New Query**
5. Copiez-collez le contenu du fichier `fix_profiles_rls.sql`
6. Cliquez sur **Run** (ou appuyez sur `Ctrl+Enter`)

### Option 2 : Script complet (toutes les tables)

Pour configurer RLS sur toutes les tables (profiles, auction_rooms, bids) :

1. Ouvrez votre dashboard Supabase
2. Allez dans **SQL Editor**
3. Cliquez sur **New Query**
4. Copiez-collez le contenu du fichier `setup_rls.sql`
5. Cliquez sur **Run**

## Vérification

Après avoir exécuté le script, vous pouvez vérifier que les politiques sont bien créées :

```sql
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;
```

Vous devriez voir 3 politiques pour la table `profiles` :
- `Users can view their own profile` (SELECT)
- `Users can insert their own profile` (INSERT)
- `Users can update their own profile` (UPDATE)

## Dépannage

### Erreur : "permission denied for table profiles"
→ Les politiques RLS ne sont pas configurées. Exécutez `fix_profiles_rls.sql`.

### Erreur : "new row violates row-level security policy"
→ Vérifiez que l'ID utilisateur dans `auth.uid()` correspond à l'ID dans la table profiles.

### Les données ne se chargent toujours pas
1. Vérifiez dans la console du navigateur (F12) les erreurs détaillées
2. Vérifiez que vous êtes bien connecté (l'ID utilisateur doit correspondre)
3. Vérifiez que les politiques RLS sont bien actives avec la requête de vérification ci-dessus

## Structure des politiques

Les politiques créées permettent :
- ✅ Les utilisateurs peuvent **lire** leur propre profil (`SELECT` où `id = auth.uid()`)
- ✅ Les utilisateurs peuvent **créer** leur propre profil (`INSERT` où `id = auth.uid()`)
- ✅ Les utilisateurs peuvent **modifier** leur propre profil (`UPDATE` où `id = auth.uid()`)
- ❌ Les utilisateurs **ne peuvent pas** voir ou modifier les profils des autres utilisateurs

## Notes importantes

- Les politiques RLS sont activées par défaut sur Supabase
- Sans politiques RLS, **aucun accès** n'est autorisé (même pour le propriétaire)
- Les politiques doivent être créées **après** la création de la table
- Si vous modifiez la structure de la table, vous devrez peut-être recréer les politiques

