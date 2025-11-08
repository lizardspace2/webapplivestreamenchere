'use client'

import { useAuth } from '@/app/contexts/AuthContext'
import AuthModal from './AuthModal'
import { useRouter } from 'next/navigation'

/**
 * Composant global qui affiche automatiquement le modal de connexion
 * si le contexte indique qu'il faut afficher l'authentification
 */
export default function GlobalAuthModal() {
  const { shouldShowAuth, setShouldShowAuth, loading } = useAuth()
  const router = useRouter()

  // Ne pas afficher pendant le chargement initial
  if (loading || !shouldShowAuth) {
    return null
  }

  return (
    <AuthModal
      isOpen={shouldShowAuth}
      onClose={() => {
        setShouldShowAuth(false)
        // Rediriger vers /auction si l'utilisateur ferme sans se connecter
        router.push('/auction')
      }}
    />
  )
}

