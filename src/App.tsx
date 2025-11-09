import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import AuthModal from './components/AuthModal'
import AuctionPage from './pages/AuctionPage'
import AdminPage from './pages/AdminPage'
import ProfilePage from './pages/ProfilePage'

/**
 * Composant global qui gère tous les modaux et composants globaux
 * Centralise la gestion de l'authentification globale
 */
function AppComponents() {
  const navigate = useNavigate()
  const { shouldShowAuth, setShouldShowAuth, loading } = useAuth()

  console.log('App: AppComponents - Render, shouldShowAuth:', shouldShowAuth, 'loading:', loading)

  // Modal d'authentification global
  if (loading || !shouldShowAuth) {
    console.log('App: AppComponents - Not showing auth modal (loading or shouldShowAuth false)')
    return null
  }

  console.log('App: AppComponents - Showing global auth modal')
  return (
    <AuthModal
      modalId="global-auth-modal"
      isOpen={shouldShowAuth}
      onClose={() => {
        console.log('App: AppComponents - Closing global auth modal')
        setShouldShowAuth(false)
        navigate('/auction')
      }}
    />
  )
}

/**
 * Composant de routage et redirection basé sur l'authentification
 * Doit être à l'intérieur de AuthProvider pour accéder au contexte
 */
function AppRouter() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, userRole, loading, shouldShowAuth, setShouldShowAuth } = useAuth()

  console.log('App: AppRouter - Render, pathname:', location.pathname, {
    user: user ? user.id : 'null',
    userRole,
    loading,
    shouldShowAuth,
  })

  // Gérer la redirection de la page d'accueil
  useEffect(() => {
    console.log('App: AppRouter - useEffect location change:', {
      pathname: location.pathname,
      loading,
      user: user ? user.id : 'null',
      userRole,
    })

    if (loading) {
      console.log('App: AppRouter - Still loading, skipping redirect')
      return
    }

    // Si on est sur la page d'accueil, rediriger selon le rôle
    if (location.pathname === '/') {
      let targetRoute = '/auction'
      
      if (user) {
        if (userRole === 'admin') {
          targetRoute = '/admin'
          console.log('App: AppRouter - User is admin, redirecting to /admin')
        } else {
          console.log('App: AppRouter - User is participant, redirecting to /auction')
        }
      } else {
        console.log('App: AppRouter - No user, redirecting to /auction')
      }
      
      console.log('App: AppRouter - Navigating to:', targetRoute)
      navigate(targetRoute, { replace: true })
    }
  }, [user, userRole, loading, navigate, location.pathname])

  // Afficher un loader sur la page d'accueil pendant la redirection
  if (location.pathname === '/') {
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
            navigate('/auction', { replace: true })
          }}
        />
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/auction" element={<AuctionPage />} />
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/" element={<Navigate to="/auction" replace />} />
    </Routes>
  )
}

/**
 * Composant principal de l'application
 * Centralise tous les providers, le layout, le routage et les composants globaux
 */
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <AppComponents />
      </AuthProvider>
    </BrowserRouter>
  )
}

