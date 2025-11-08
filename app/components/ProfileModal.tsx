'use client'

import { useState, useEffect, FormEvent } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface ProfileModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete: () => void
  user: User
}

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

export default function ProfileModal({ isOpen, onClose, onComplete, user }: ProfileModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
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
  })

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(1)
      setError(null)
      setProfileData({
        first_name: '',
        last_name: '',
        address: '',
        postal_code: '',
        city: '',
        country: 'France',
        additional_info: '',
        phone_country_code: '+33',
        phone_number: '',
      })
    }
  }, [isOpen])

  // Close on Escape key (désactivé - le profil doit être complété)
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        // Ne pas fermer avec Escape - le profil doit être complété
        e.preventDefault()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  function handleInputChange(field: keyof ProfileData, value: string) {
    setProfileData((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  function validateStep(step: number): boolean {
    setError(null)
    
    if (step === 1) {
      if (!profileData.first_name.trim()) {
        setError('Le prénom est requis')
        return false
      }
      if (!profileData.last_name.trim()) {
        setError('Le nom est requis')
        return false
      }
    }
    
    if (step === 2) {
      if (!profileData.address.trim()) {
        setError('L\'adresse est requise')
        return false
      }
      if (!profileData.postal_code.trim()) {
        setError('Le code postal est requis')
        return false
      }
      if (!profileData.city.trim()) {
        setError('La ville est requise')
        return false
      }
      if (!profileData.country.trim()) {
        setError('Le pays est requis')
        return false
      }
    }
    
    if (step === 3) {
      if (!profileData.phone_number.trim()) {
        setError('Le numéro de téléphone est requis')
        return false
      }
      // Validation basique du numéro de téléphone
      const phoneRegex = /^[0-9]{9,15}$/
      const cleanPhone = profileData.phone_number.replace(/\s/g, '')
      if (!phoneRegex.test(cleanPhone)) {
        setError('Le numéro de téléphone doit contenir entre 9 et 15 chiffres')
        return false
      }
    }
    
    return true
  }

  function handleNext() {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3))
    }
  }

  function handlePrevious() {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
    setError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    
    if (!validateStep(3)) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          ...profileData,
          phone_number: profileData.phone_number.replace(/\s/g, ''),
          updated_at: new Date().toISOString(),
        })

      if (upsertError) throw upsertError

      onComplete()
      onClose()
    } catch (err: any) {
      console.error('Error saving profile:', err)
      setError(err.message || 'Erreur lors de la sauvegarde du profil')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          // Ne pas fermer si le profil n'est pas complété
        }
      }}
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={(e) => {
          // Ne pas fermer si le profil n'est pas complété
          e.stopPropagation()
        }}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl transform transition-all duration-300 scale-100">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-5">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white">
                Complétez vos informations
              </h2>
              <button
                onClick={() => {
                  // Ne pas permettre de fermer si le profil n'est pas complété
                  // Le bouton "QUITTER SANS ENREGISTRER" permet de fermer
                }}
                className="text-white/50 cursor-not-allowed p-1 rounded-lg"
                aria-label="Fermer (non disponible)"
                disabled
                title="Veuillez compléter votre profil"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="mt-2">
              <span className="text-red-200 font-semibold text-sm">
                ÉTAPE {currentStep} SUR 3
              </span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="h-1 bg-gray-200">
            <div
              className="h-full bg-gradient-to-r from-red-600 to-red-700 transition-all duration-300"
              style={{ width: `${(currentStep / 3) * 100}%` }}
            />
          </div>

          {/* Content */}
          <div className="px-6 py-6">
            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start">
                  <svg
                    className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              </div>
            )}

            {/* Step 1: Informations personnelles */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <p className="text-gray-700">
                  Veuillez renseigner vos informations personnelles pour compléter votre profil.
                </p>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-red-600 font-bold text-sm">
                      INFORMATIONS PERSONNELLES
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Prénom
                    </label>
                    <input
                      id="first_name"
                      type="text"
                      value={profileData.first_name}
                      onChange={(e) => handleInputChange('first_name', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none"
                      placeholder="Votre prénom"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nom
                    </label>
                    <input
                      id="last_name"
                      type="text"
                      value={profileData.last_name}
                      onChange={(e) => handleInputChange('last_name', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none"
                      placeholder="Votre nom"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Adresse */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <p className="text-gray-700">
                  Veuillez indiquer les coordonnées postales de votre adresse de facturation.
                </p>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-red-600 font-bold text-sm">
                      ADRESSE
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Adresse
                    </label>
                    <input
                      id="address"
                      type="text"
                      value={profileData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none"
                      placeholder="Numéro et nom de rue"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Code postal
                      </label>
                      <input
                        id="postal_code"
                        type="text"
                        value={profileData.postal_code}
                        onChange={(e) => handleInputChange('postal_code', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none"
                        placeholder="75001"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1.5">
                        Ville
                      </label>
                      <input
                        id="city"
                        type="text"
                        value={profileData.city}
                        onChange={(e) => handleInputChange('city', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none"
                        placeholder="Paris"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Pays
                    </label>
                    <select
                      id="country"
                      value={profileData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none bg-white"
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
                    <label htmlFor="additional_info" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Informations complémentaires
                    </label>
                    <textarea
                      id="additional_info"
                      value={profileData.additional_info}
                      onChange={(e) => handleInputChange('additional_info', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none resize-none"
                      placeholder="Appartement, étage, bâtiment, etc."
                    />
                    <p className="text-xs text-gray-500 mt-1">Optionnel</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Téléphone */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <p className="text-gray-700">
                  Veuillez renseigner votre numéro de téléphone. Un code d&apos;activation sera envoyé sur votre téléphone mobile afin de confirmer votre identité.
                </p>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white px-4 text-red-600 font-bold text-sm">
                      MOBILE
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="phone_country_code" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Indicatif
                    </label>
                    <select
                      id="phone_country_code"
                      value={profileData.phone_country_code}
                      onChange={(e) => handleInputChange('phone_country_code', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none bg-white"
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
                    <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Tél. mobile
                    </label>
                    <input
                      id="phone_number"
                      type="tel"
                      value={profileData.phone_number}
                      onChange={(e) => handleInputChange('phone_number', e.target.value.replace(/\D/g, ''))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all outline-none"
                      placeholder="612345678"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mt-8 flex items-center justify-between pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
              >
                QUITTER SANS ENREGISTRER
              </button>

              <div className="flex gap-3">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                  >
                    PRÉCÉDENT
                  </button>
                )}
                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 font-semibold transition-all shadow-md hover:shadow-lg"
                  >
                    SUIVANT
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-6 py-2.5 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {loading ? (
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
                      'VALIDER MON MOBILE'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

