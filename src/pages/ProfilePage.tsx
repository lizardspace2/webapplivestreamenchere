import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import AuthModal from '@/components/AuthModal'
import Toast from '@/components/Toast'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/contexts/AuthContext'

interface ProfileData {
  first_name: string
  last_name: string
  address: string
  postal_code: string
  city: string
  country: string
  additional_info: string
  phone_country_code: string
  phone_number: string
  role: 'admin' | 'participant'
}

const countries = [
  { code: '+33', name: 'France', flag: '🇫🇷' },
  { code: '+32', name: 'Belgique', flag: '🇧🇪' },
  { code: '+41', name: 'Suisse', flag: '🇨🇭' },
  { code: '+1', name: 'Canada / USA', flag: '🇺🇸' },
  { code: '+44', name: 'Royaume-Uni', flag: '🇬🇧' },
  { code: '+49', name: 'Allemagne', flag: '🇩🇪' },
  { code: '+34', name: 'Espagne', flag: '🇪🇸' },
  { code: '+39', name: 'Italie', flag: '🇮🇹' },
]

const countryList = [
  'France',
  'Belgique',
  'Suisse',
  'Canada',
  'États-Unis',
  'Royaume-Uni',
  'Allemagne',
  'Espagne',
  'Italie',
  'Autre',
]

export default function ProfilePage() {
  const navigate = useNavigate()
  const { toast, showError, showSuccess, hideToast } = useToast()
  const { 
    user, 
    profile: contextProfile,
    loading: authLoading, 
    signOut: authSignOut,
    refreshProfile,
    refreshUser
  } = useAuth()
  const [saving, setSaving] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [profileData, setProfileData] = useState<ProfileData>({
    first_name: '',
    last_name: '',
    address: '',
    postal_code: '',
    city: '',
    country: 'France',
    additional_info: '',
    phone_country_code: '+33',
    phone_number: '',
    role: 'participant',
  })

  async function loadProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.warn('Error loading profile:', error)
        return
      }

      if (data) {
        setProfileData({
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          address: data.address || '',
          postal_code: data.postal_code || '',
          city: data.city || '',
          country: data.country || 'France',
          additional_info: data.additional_info || '',
          phone_country_code: data.phone_country_code || '+33',
          phone_number: data.phone_number || '',
          role: (data.role as 'admin' | 'participant') || 'participant',
        })
      }
    } catch (e) {
      console.error('Failed to load profile:', e)
    }
  }

  // Charger le profil depuis le contexte ou depuis la base de données
  useEffect(() => {
    let mounted = true
    
    if (user && !authLoading) {
      // Si le contexte a déjà un profil, l'utiliser
      if (contextProfile && mounted) {
        console.log('ProfilePage: Using context profile:', contextProfile)
        // Utiliser directement phone_country_code du contexte s'il existe
        let phoneCountryCode = contextProfile.phone_country_code || '+33'
        let phoneNumber = contextProfile.phone_number || ''
        
        // Si le numéro commence par un code pays mais qu'on n'a pas phone_country_code, l'extraire
        if (phoneNumber && phoneNumber.startsWith('+') && !contextProfile.phone_country_code) {
          const match = phoneNumber.match(/^(\+\d{1,3})/)
          if (match) {
            phoneCountryCode = match[1]
            phoneNumber = phoneNumber.substring(match[1].length).trim()
          }
        }
        
        if (mounted) {
          setProfileData({
            first_name: contextProfile.first_name || '',
            last_name: contextProfile.last_name || '',
            address: contextProfile.address || '',
            postal_code: contextProfile.postal_code || '',
            city: contextProfile.city || '',
            country: contextProfile.country || 'France',
            additional_info: contextProfile.additional_info || '',
            phone_country_code: phoneCountryCode,
            phone_number: phoneNumber,
            role: contextProfile.role || 'participant',
          })
          setIsAuthModalOpen(false)
        }
      } else if (mounted) {
        // Si pas de profil dans le contexte, essayer de le rafraîchir d'abord
        if (!contextProfile) {
          console.log('ProfilePage: No context profile, refreshing...')
          refreshProfile().then(() => {
            // Après le refresh, attendre un peu puis charger depuis la DB si toujours pas de profil
            setTimeout(() => {
              if (mounted && user) {
                loadProfile(user.id)
              }
            }, 300)
          })
        } else {
          // Sinon, charger directement depuis la base de données
          console.log('ProfilePage: Loading profile from database for user:', user.id)
          loadProfile(user.id)
        }
        setIsAuthModalOpen(false)
      }
    } else if (!authLoading && !user && mounted) {
      // Si le chargement est terminé et qu'il n'y a pas d'utilisateur, ouvrir le modal
      setIsAuthModalOpen(true)
    }
    
    return () => {
      mounted = false
    }
  }, [user, contextProfile, authLoading, refreshProfile])

  function handleInputChange(field: keyof ProfileData, value: string) {
    setProfileData((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) {
      showError('Vous devez être connecté pour modifier votre profil')
      return
    }

    setSaving(true)

    try {
      console.log('Saving profile for user:', user.id)
      console.log('Profile data:', profileData)
      
      const profileToSave = {
        id: user.id,
        first_name: profileData.first_name || null,
        last_name: profileData.last_name || null,
        address: profileData.address || null,
        postal_code: profileData.postal_code || null,
        city: profileData.city || null,
        country: profileData.country || 'France',
        additional_info: profileData.additional_info || null,
        phone_country_code: profileData.phone_country_code || '+33',
        phone_number: profileData.phone_number.replace(/\s/g, '') || null,
        role: profileData.role || 'participant',
        updated_at: new Date().toISOString(),
      }

      console.log('Profile: handleSubmit - Profile to save:', profileToSave)
      console.log('Profile: handleSubmit - User ID:', user.id)
      
      const startTime = Date.now()
      console.log('Profile: handleSubmit - Starting upsert query...')
      
      const { data, error } = await supabase
        .from('profiles')
        .upsert(profileToSave, {
          onConflict: 'id',
        })
        .select()
      
      const queryTime = Date.now() - startTime
      console.log(`Profile: handleSubmit - Query completed in ${queryTime}ms`)
      console.log('Profile: handleSubmit - Query result:', { data, error })

      if (error) {
        console.error('Profile: handleSubmit - Supabase error details:', {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
          status: (error as any).status,
          statusText: (error as any).statusText,
        })
        console.error('Profile: handleSubmit - Full error object:', error)
        
        // Si erreur RLS, donner un message plus clair avec instructions
        if (error.code === '42501' || error.code === 'PGRST301' || error.message?.includes('permission') || error.message?.includes('policy') || error.message?.includes('RLS') || error.message?.includes('row-level security')) {
          console.error('Profile: handleSubmit - RLS/permission error detected')
          showError(
            'Erreur de permissions RLS. ' +
            'Exécutez le script supabase/fix_profiles_rls.sql dans votre dashboard Supabase ' +
            'pour désactiver temporairement RLS et permettre l\'accès à la table profiles.'
          )
        } else if (error.code === 'PGRST116') {
          console.error('Profile: handleSubmit - Not found error')
          showError('Profil non trouvé. Veuillez réessayer.')
        } else {
          console.error('Profile: handleSubmit - Other error type')
          showError(error.message || 'Erreur lors de la sauvegarde du profil')
        }
        throw error
      }

      console.log('Profile: handleSubmit - Profile saved successfully:', data)
      console.log('Profile: handleSubmit - Refreshing profile and user in context...')
      
      // Rafraîchir le profil et l'utilisateur dans le contexte pour mettre à jour le rôle
      await refreshProfile()
      await refreshUser()
      console.log('Profile: handleSubmit - Profile and user refreshed in context')
      
      // Attendre un peu pour que le contexte soit mis à jour, puis recharger le profil localement
      await new Promise(resolve => setTimeout(resolve, 200))
      if (user) {
        console.log('Profile: handleSubmit - Reloading profile from database...')
        await loadProfile(user.id)
      }
      
      showSuccess('Profil mis à jour avec succès!')
      console.log('Profile: handleSubmit - Success message shown')
    } catch (err: any) {
      console.error('Error saving profile:', err)
      showError(err.message || 'Erreur lors de la sauvegarde du profil')
    } finally {
      setSaving(false)
    }
  }

  async function handleSignOut() {
    try {
      await authSignOut()
      navigate('/auction')
    } catch (err) {
      console.error(err)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Mon Profil</h1>
              <p className="text-gray-600 mt-1">Gérez vos informations personnelles</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate(-1)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
              >
                Retour
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-colors border border-red-200"
              >
                Se déconnecter
              </button>
            </div>
          </div>

          {/* User Info */}
          {user ? (
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                {user.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <div className="font-semibold text-gray-800">{user.email}</div>
                <div className="text-sm text-gray-600">
                  {profileData.first_name && profileData.last_name
                    ? `${profileData.first_name} ${profileData.last_name}`
                    : 'Profil incomplet'}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-sm">
                ⚠️ Veuillez vous connecter pour accéder à votre profil
              </p>
            </div>
          )}
        </div>

        {/* Profile Form */}
        {user ? (
          <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 space-y-6">
          {/* Informations personnelles */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Informations personnelles</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Prénom *
                </label>
                <input
                  id="first_name"
                  type="text"
                  value={profileData.first_name}
                  onChange={(e) => handleInputChange('first_name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  required
                />
              </div>
              <div>
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nom *
                </label>
                <input
                  id="last_name"
                  type="text"
                  value={profileData.last_name}
                  onChange={(e) => handleInputChange('last_name', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  required
                />
              </div>
            </div>
          </div>

          {/* Adresse */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Adresse</h2>
            <div className="space-y-4">
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse *
                </label>
                <input
                  id="address"
                  type="text"
                  value={profileData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  required
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-2">
                    Code postal *
                  </label>
                  <input
                    id="postal_code"
                    type="text"
                    value={profileData.postal_code}
                    onChange={(e) => handleInputChange('postal_code', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                    Ville *
                  </label>
                  <input
                    id="city"
                    type="text"
                    value={profileData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                    required
                  />
                </div>
              </div>
              <div>
                <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                  Pays *
                </label>
                <select
                  id="country"
                  value={profileData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-white"
                  required
                >
                  {countryList.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="additional_info" className="block text-sm font-medium text-gray-700 mb-2">
                  Informations complémentaires
                </label>
                <textarea
                  id="additional_info"
                  value={profileData.additional_info}
                  onChange={(e) => handleInputChange('additional_info', e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none resize-none"
                  placeholder="Appartement, étage, bâtiment, etc."
                />
                <p className="text-xs text-gray-500 mt-1">Optionnel</p>
              </div>
            </div>
          </div>

          {/* Téléphone */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Contact</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="phone_country_code" className="block text-sm font-medium text-gray-700 mb-2">
                  Indicatif *
                </label>
                <select
                  id="phone_country_code"
                  value={profileData.phone_country_code}
                  onChange={(e) => handleInputChange('phone_country_code', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-white"
                  required
                >
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.flag} {country.code}
                    </option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-2">
                  Numéro de téléphone *
                </label>
                <input
                  id="phone_number"
                  type="tel"
                  value={profileData.phone_number}
                  onChange={(e) => handleInputChange('phone_number', e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                  placeholder="612345678"
                  required
                />
              </div>
            </div>
          </div>

          {/* Rôle */}
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">Rôle</h2>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                Rôle *
              </label>
              <select
                id="role"
                value={profileData.role}
                onChange={(e) => handleInputChange('role', e.target.value as 'admin' | 'participant')}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none bg-white"
                required
              >
                <option value="participant">Participant</option>
                <option value="admin">Administrateur</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Le rôle administrateur vous donne accès au panneau de gestion des enchères.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {saving ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Enregistrement...
                </>
              ) : (
                'Enregistrer les modifications'
              )}
            </button>
          </div>
        </form>
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">Connectez-vous pour modifier votre profil</p>
            </div>
          </div>
        )}
      </div>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />

      {/* Auth Modal - affiché si pas d'utilisateur */}
      <AuthModal
        modalId="profile-auth-modal"
        isOpen={isAuthModalOpen && !user}
        onClose={() => {
          if (user) {
            setIsAuthModalOpen(false)
          } else {
            // Si pas d'utilisateur, rediriger vers /auction
            navigate('/auction')
          }
        }}
        onAuthSuccess={() => {
          setIsAuthModalOpen(false)
          // Le profil sera chargé automatiquement via le useEffect qui écoute user
        }}
      />
    </div>
  )
}


