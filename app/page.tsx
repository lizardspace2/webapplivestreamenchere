'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/app/contexts/AuthContext'
import AuthModal from '@/app/components/AuthModal'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  const router = useRouter()
  const { user, userRole, loading, shouldShowAuth, setShouldShowAuth } = useAuth()

  // Rediriger selon le rôle
  useEffect(() => {
    if (loading) return // Attendre que le chargement soit terminé

    let targetRoute = '/auction'
    
    if (user) {
      if (userRole === 'admin') {
        targetRoute = '/admin'
      }
    }
    
    router.replace(targetRoute)
  }, [user, userRole, loading, router])

  return (
    <>
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
      </div>

      {/* Modal de connexion si nécessaire */}
      <AuthModal
        modalId="home-auth-modal"
        isOpen={shouldShowAuth && !loading}
        onClose={() => {
          setShouldShowAuth(false)
          // Rediriger vers /auction même sans connexion
          router.replace('/auction')
        }}
      />
    </>
  )
}

