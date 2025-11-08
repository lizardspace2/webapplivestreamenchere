'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { getUserRole, isAdmin } from '@/lib/user-role'
import AuthModal from '@/app/components/AuthModal'
import ProfileModal from '@/app/components/ProfileModal'
import Toast from '@/app/components/Toast'
import { useToast } from '@/app/hooks/useToast'
import type { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface Bid {
  id: string
  room: string
  bidder: string
  amount: number
  inserted_at: string
  user_email?: string
}

export default function AdminPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const { toast, showError, showWarning, showSuccess, hideToast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [bids, setBids] = useState<Bid[]>([])
  const [currentBid, setCurrentBid] = useState({ amount: 10, bidder: null as string | null })
  const [connected, setConnected] = useState(false)
  const [auctionStatus, setAuctionStatus] = useState<'active' | 'paused' | 'ended'>('active')
  const [isStreaming, setIsStreaming] = useState(false)
  const [lastBidTime, setLastBidTime] = useState<Date | null>(null)
  const [supabaseConfigured, setSupabaseConfigured] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [profileComplete, setProfileComplete] = useState(false)
  const [autoCloseTimer, setAutoCloseTimer] = useState<NodeJS.Timeout | null>(null)

  const room = 'auction-room'
  const startingPrice = 10
  const minIncrement = 1
  const AUTO_CLOSE_DELAY = 30000 // 30 secondes sans enchère = clôture automatique

  // Vérifier la configuration Supabase
  useEffect(() => {
    setSupabaseConfigured(isSupabaseConfigured())
  }, [])

  // Vérifier le rôle et rediriger si pas admin
  useEffect(() => {
    async function checkAdminRole() {
      if (user) {
        const admin = await isAdmin(user)
        setIsAdminUser(admin)
        if (!admin) {
          router.push('/auction')
        }
      }
    }
    checkAdminRole()
  }, [user, router])

  // Vérifier le statut de l'enchère et les nouvelles enchères
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function init() {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured')
        return
      }

      // Get current user
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        if (user) {
          await checkProfileComplete(user.id)
        }
      } catch (e) {
        console.warn('Failed to get user', e)
      }

      // Auth state change listener
      supabase.auth.onAuthStateChange(async (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) {
          await checkProfileComplete(session.user.id)
        } else {
          setProfileComplete(false)
        }
      })

      // Subscribe to auction room status
      const roomChannel = supabase
        .channel('auction-room-status')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'auction_rooms',
            filter: `name=eq.${room}`,
          },
          (payload) => {
            const roomData = payload.new as { status: 'active' | 'paused' | 'ended' }
            setAuctionStatus(roomData.status)
          }
        )
        .subscribe()

      // Subscribe to bids table inserts for this room
      channel = supabase
        .channel('public:bids')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'bids',
            filter: `room=eq.${room}`,
          },
          (payload) => {
            const newBid = payload.new as Bid
            setBids((prev) => [...prev, newBid])
            setCurrentBid((current) =>
              newBid.amount > (current.amount || 0)
                ? { amount: newBid.amount, bidder: newBid.bidder }
                : current
            )
            setLastBidTime(new Date())
            // Réinitialiser le timer de clôture automatique
            resetAutoCloseTimer()
          }
        )
        .subscribe((status) => {
          setConnected(status === 'SUBSCRIBED')
        })

      // Initial fetch of auction room status
      try {
        const { data: roomData } = await supabase
          .from('auction_rooms')
          .select('status')
          .eq('name', room)
          .single()

        if (roomData) {
          setAuctionStatus(roomData.status)
        } else {
          // Créer la salle si elle n'existe pas
          await supabase.from('auction_rooms').insert({
            name: room,
            description: 'Salle d\'enchères principale',
            starting_price: startingPrice,
            min_increment: minIncrement,
            status: 'active',
          })
          setAuctionStatus('active')
        }
      } catch (e) {
        console.warn('Failed to fetch room status:', e)
      }

      // Initial fetch of bids
      try {
        const { data, error } = await supabase
          .from('bids')
          .select('*')
          .eq('room', room)
          .order('inserted_at', { ascending: true })
          .limit(200)

        if (error) throw error

        if (data && data.length > 0) {
          setBids(data)
          const highest = data.reduce(
            (max, b) => (b.amount > max.amount ? b : max),
            { amount: startingPrice, bidder: null }
          )
          setCurrentBid({ amount: highest.amount, bidder: highest.bidder })
          setLastBidTime(new Date(data[data.length - 1].inserted_at))
        } else {
          setCurrentBid({ amount: startingPrice, bidder: null })
        }
      } catch (e) {
        console.warn('Failed to fetch initial bids', e)
      }
    }

    init()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer)
      }
    }
  }, [room, startingPrice])

  // Timer de clôture automatique
  function resetAutoCloseTimer() {
    if (autoCloseTimer) {
      clearTimeout(autoCloseTimer)
    }

    if (auctionStatus === 'active') {
      const timer = setTimeout(() => {
        handleCloseAuction()
      }, AUTO_CLOSE_DELAY)
      setAutoCloseTimer(timer)
    }
  }

  useEffect(() => {
    if (auctionStatus === 'active' && lastBidTime) {
      resetAutoCloseTimer()
    }
    return () => {
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer)
      }
    }
  }, [auctionStatus, lastBidTime])

  async function handleStartStream() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsStreaming(true)
        showSuccess('Diffusion démarrée avec succès!')
      }
    } catch (err) {
      console.error('Error accessing media devices:', err)
      showError('Impossible d\'accéder à la caméra/microphone. Vérifiez les permissions.')
    }
  }

  async function handleStopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setIsStreaming(false)
    showInfo('Diffusion arrêtée')
  }

  async function handleCloseAuction() {
    if (!window.confirm('Êtes-vous sûr de vouloir clôturer cette vente aux enchères ?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('auction_rooms')
        .update({ status: 'ended', ends_at: new Date().toISOString() })
        .eq('name', room)

      if (error) throw error

      setAuctionStatus('ended')
      if (autoCloseTimer) {
        clearTimeout(autoCloseTimer)
        setAutoCloseTimer(null)
      }
      showSuccess('Vente aux enchères clôturée avec succès!')
    } catch (err: any) {
      console.error('Failed to close auction:', err)
      showError(err.message || 'Erreur lors de la clôture')
    }
  }

  async function handlePauseAuction() {
    try {
      const { error } = await supabase
        .from('auction_rooms')
        .update({ status: 'paused' })
        .eq('name', room)

      if (error) throw error
      setAuctionStatus('paused')
      showInfo('Vente aux enchères mise en pause')
    } catch (err: any) {
      console.error('Failed to pause auction:', err)
      showError(err.message || 'Erreur lors de la mise en pause')
    }
  }

  async function handleResumeAuction() {
    try {
      const { error } = await supabase
        .from('auction_rooms')
        .update({ status: 'active' })
        .eq('name', room)

      if (error) throw error
      setAuctionStatus('active')
      setLastBidTime(new Date())
      showSuccess('Vente aux enchères reprise avec succès!')
    } catch (err: any) {
      console.error('Failed to resume auction:', err)
      showError(err.message || 'Erreur lors de la reprise')
    }
  }

  async function checkProfileComplete(userId: string) {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, address, postal_code, city, country, phone_number')
        .eq('id', userId)
        .single()

      if (error && error.code !== 'PGRST116') {
        console.warn('Error checking profile:', error)
        return
      }

      const isComplete = data && 
        data.first_name && 
        data.last_name && 
        data.address && 
        data.postal_code && 
        data.city && 
        data.country && 
        data.phone_number

      setProfileComplete(!!isComplete)

      if (!isComplete) {
        setIsProfileModalOpen(true)
      }
    } catch (e) {
      console.warn('Failed to check profile:', e)
      setIsProfileModalOpen(true)
    }
  }

  function handleAuthSuccess(authUser: User) {
    setUser(authUser)
    checkProfileComplete(authUser.id)
  }

  function handleProfileComplete() {
    setProfileComplete(true)
    setIsProfileModalOpen(false)
  }

  async function signOut() {
    try {
      await handleStopStream()
      await supabase.auth.signOut()
      setUser(null)
      router.push('/auction')
    } catch (err) {
      console.error(err)
    }
  }

  if (!isAdminUser && user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Redirection en cours...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {!supabaseConfigured && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl shadow-xl p-6 mb-4">
            <h2 className="text-xl font-bold text-red-800 mb-2">⚠️ Configuration Supabase requise</h2>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Panneau Commissaire-Priseur</h1>
              <p className="text-sm text-gray-600 mt-1">Gestion de la vente aux enchères</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {connected ? 'Connecté' : 'Déconnecté'}
                </span>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                auctionStatus === 'active' ? 'bg-green-100 text-green-800' :
                auctionStatus === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {auctionStatus === 'active' ? 'ACTIVE' : auctionStatus === 'paused' ? 'EN PAUSE' : 'TERMINÉE'}
              </div>
            </div>
          </div>

          {/* Auth Section */}
          {user ? (
            <div className="flex items-center justify-between bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border border-purple-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user.email?.charAt(0).toUpperCase() || 'A'}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-800">{user.email}</div>
                  <div className="text-xs text-gray-500">Commissaire-Priseur</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => router.push('/profile')}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium text-sm transition-colors border border-blue-200"
                >
                  Mon profil
                </button>
                <button
                  onClick={signOut}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium text-sm transition-colors border border-red-200"
                >
                  Se déconnecter
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Connectez-vous pour accéder au panneau d&apos;administration
                  </p>
                </div>
                <button
                  onClick={() => setIsAuthModalOpen(true)}
                  className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold text-sm transition-all transform hover:scale-105 active:scale-95 shadow-md hover:shadow-lg"
                >
                  Se connecter
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Video Stream */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl p-4">
            <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!isStreaming && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <div className="text-center text-white">
                    <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm opacity-75">Aucun flux actif</p>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-4 flex gap-2">
              {!isStreaming ? (
                <button
                  onClick={handleStartStream}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                >
                  🎥 Démarrer la diffusion
                </button>
              ) : (
                <button
                  onClick={handleStopStream}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                >
                  ⏹️ Arrêter la diffusion
                </button>
              )}
            </div>
          </div>

          {/* Control Panel */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow-xl p-6 flex flex-col">
            <div className="mb-6">
              <div className="text-xs text-gray-600 mb-1">Prix actuel</div>
              <div className="text-4xl font-bold text-gray-800">{currentBid.amount} €</div>
              <div className="text-sm text-gray-600 mt-1">
                {currentBid.bidder ? `par ${currentBid.bidder}` : "Pas d'enchère"}
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {auctionStatus === 'active' && (
                <>
                  <button
                    onClick={handlePauseAuction}
                    className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium transition-colors"
                  >
                    ⏸️ Mettre en pause
                  </button>
                  <button
                    onClick={handleCloseAuction}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                  >
                    🔒 Clôturer la vente
                  </button>
                  {lastBidTime && (
                    <div className="text-xs text-gray-500 mt-2">
                      Dernière enchère: {new Date(lastBidTime).toLocaleTimeString()}
                    </div>
                  )}
                </>
              )}

              {auctionStatus === 'paused' && (
                <button
                  onClick={handleResumeAuction}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                >
                  ▶️ Reprendre
                </button>
              )}

              {auctionStatus === 'ended' && (
                <div className="text-center text-gray-600 text-sm">
                  Vente terminée
                </div>
              )}
            </div>

            <div className="mt-auto">
              <div className="text-xs text-gray-600 mb-2">Historique récent</div>
              <div className="overflow-auto space-y-2" style={{ maxHeight: '200px' }}>
                {bids.length === 0 && (
                  <div className="text-sm text-gray-400">Aucune enchère</div>
                )}
                {bids
                  .slice(-10)
                  .reverse()
                  .map((b) => (
                    <div
                      key={b.id || b.inserted_at}
                      className="bg-white rounded p-2 border border-gray-200"
                    >
                      <div className="text-sm font-medium text-gray-800">
                        {b.bidder} — {b.amount} €
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(b.inserted_at).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bids Feed */}
        <div className="mt-4 bg-white rounded-2xl shadow-xl p-6">
          <h3 className="font-semibold text-lg mb-4">Toutes les enchères</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-auto">
            {bids.length === 0 && (
              <div className="text-sm text-gray-400 col-span-full">Aucune enchère enregistrée</div>
            )}
            {bids.map((bid) => (
              <div
                key={bid.id || bid.inserted_at}
                className="rounded-lg p-3 border border-gray-200 hover:border-purple-400 transition-colors"
              >
                <div className="text-xs text-gray-500 mb-1">
                  {bid.bidder} •{' '}
                  <span className="text-[10px]">
                    {new Date(bid.inserted_at || Date.now()).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-lg font-bold text-purple-600">{bid.amount} €</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* Profile Modal */}
      {user && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => {
            if (profileComplete) {
              setIsProfileModalOpen(false)
            }
          }}
          onComplete={handleProfileComplete}
          user={user}
        />
      )}

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  )
}

