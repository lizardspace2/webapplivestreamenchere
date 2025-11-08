# Migration Next.js vers React TypeScript

Ce projet a été migré de Next.js vers React TypeScript avec Vite.

## Changements principaux

### Structure
- `app/` → `src/`
- `app/components/` → `src/components/`
- `app/pages/` → `src/pages/`
- `app/contexts/` → `src/contexts/`
- `app/hooks/` → `src/hooks/`

### Routing
- Next.js App Router → React Router v6
- `useRouter()` de `next/navigation` → `useNavigate()` de `react-router-dom`
- `router.push()` → `navigate()`
- `router.replace()` → `navigate(..., { replace: true })`
- `router.back()` → `navigate(-1)`

### Imports
- Suppression de `'use client'`
- Suppression de `export const dynamic = 'force-dynamic'`
- `@/app/...` → `@/...`
- `process.env.NEXT_PUBLIC_*` → `import.meta.env.VITE_*`

### Configuration
- `next.config.js` → `vite.config.ts`
- `package.json` mis à jour avec Vite et React Router
- `tsconfig.json` adapté pour Vite

## Variables d'environnement

Créer un fichier `.env` avec :
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_LIVEPEER_STREAM_ID=...
VITE_LIVEPEER_PLAYBACK_ID=...
VITE_LIVEPEER_PLAYBACK_URL=...
```

## Commandes

```bash
npm install
npm run dev
npm run build
```

