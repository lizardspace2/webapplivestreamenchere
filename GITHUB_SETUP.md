# Guide pour publier sur GitHub

## Méthode 1 : Créer un nouveau dépôt sur GitHub

1. **Créer le dépôt sur GitHub** :
   - Allez sur https://github.com/new
   - Nom du dépôt : `webapplivestreamenchere` (ou un autre nom)
   - Laissez-le **vide** (ne cochez pas "Initialize with README")
   - Cliquez sur "Create repository"

2. **Mettre à jour l'URL du remote** :
   ```bash
   git remote set-url origin https://github.com/VOTRE_USERNAME/webapplivestreamenchere.git
   ```
   (Remplacez VOTRE_USERNAME par votre nom d'utilisateur GitHub)

3. **Pousser le code** :
   ```bash
   git push -u origin main
   ```

## Méthode 2 : Utiliser GitHub CLI (si installé)

```bash
gh repo create webapplivestreamenchere --public --source=. --remote=origin --push
```

## Méthode 3 : Si le dépôt existe déjà avec un autre nom

```bash
# Voir l'URL actuelle
git remote -v

# Changer l'URL
git remote set-url origin https://github.com/VOTRE_USERNAME/AUTRE_NOM.git

# Pousser
git push -u origin main
```

## En cas d'erreur d'authentification

Si vous obtenez une erreur d'authentification, utilisez un Personal Access Token :

1. Allez sur GitHub > Settings > Developer settings > Personal access tokens > Tokens (classic)
2. Créez un nouveau token avec les permissions `repo`
3. Utilisez le token comme mot de passe lors du push

Ou configurez SSH :
```bash
# Générer une clé SSH (si pas déjà fait)
ssh-keygen -t ed25519 -C "votre_email@example.com"

# Ajouter la clé à GitHub (copiez le contenu de ~/.ssh/id_ed25519.pub)
# Puis changez l'URL en SSH :
git remote set-url origin git@github.com:VOTRE_USERNAME/webapplivestreamenchere.git
```

