'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthModal from './components/AuthModal'
import './globals.css'

/**
 * Composant global qui gère tous les modaux et composants globaux
 * Centralise la gestion de l'authentification globale
 */
function AppComponents() {
  const router = useRouter()
  const { shouldShowAuth, setShouldShowAuth, loading } = useAuth()

  // Modal d'authentification global
  if (loading || !shouldShowAuth) {
    return null
  }

  return (
    <AuthModal
      modalId="global-auth-modal"
      isOpen={shouldShowAuth}
      onClose={() => {
        setShouldShowAuth(false)
        router.push('/auction')
      }}
    />
  )
}

/**
 * Composant de routage et redirection basé sur l'authentification
 * Doit être à l'intérieur de AuthProvider pour accéder au contexte
 */
function AppRouter({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, userRole, loading, shouldShowAuth, setShouldShowAuth } = useAuth()

  // Gérer la redirection de la page d'accueil
  useEffect(() => {
    if (loading) return

    // Si on est sur la page d'accueil, rediriger selon le rôle
    if (pathname === '/') {
      let targetRoute = '/auction'
      
      if (user) {
        if (userRole === 'admin') {
          targetRoute = '/admin'
        }
      }
      
      router.replace(targetRoute)
    }
  }, [user, userRole, loading, router, pathname])

  // Afficher un loader sur la page d'accueil pendant la redirection
  if (pathname === '/') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Chargement...</p>
            </>
          ) : (
            <p className="text-gray-600">Redirection en cours...</p>
          )}
        </div>
        {/* Modal de connexion si nécessaire sur la page d'accueil */}
        <AuthModal
          modalId="home-auth-modal"
          isOpen={shouldShowAuth && !loading}
          onClose={() => {
            setShouldShowAuth(false)
            router.replace('/auction')
          }}
        />
      </div>
    )
  }

  return <>{children}</>
}

interface AppProps {
  children: React.ReactNode
}

/**
 * Composant principal de l'application
 * Centralise tous les providers, le layout, le routage et les composants globaux
 */
export default function App({ children }: AppProps) {
  return (
    <AuthProvider>
      <AppRouter>
        {children}
      </AppRouter>
      <AppComponents />
    </AuthProvider>
  )
}

