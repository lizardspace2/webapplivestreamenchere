import { useEffect, useRef, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import AuthModal from '@/components/AuthModal'
import ProfileModal from '@/components/ProfileModal'
import Toast from '@/components/Toast'
import { useToast } from '@/hooks/useToast'
import type { User } from '@supabase/supabase-js'

interface Bid {
  id: string
  room: string
  bidder: string
  amount: number
  inserted_at: string
  user_email?: string
}

export default function AdminPage() {
  const navigate = useNavigate()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const { toast, showError, showSuccess, showInfo, hideToast } = useToast()
  const { user, isAdmin: isAdminUser, loading: authLoading, signOut: authSignOut, refreshUser } = useAuth()
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
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null)

  const room = 'auction-room'
  const startingPrice = 10
  const minIncrement = 1
  const AUTO_CLOSE_DELAY = 30000 // 30 secondes sans enchÃ¨re = clÃ´ture automatique

  // VÃ©rifier la configuration Supabase
  useEffect(() => {
    setSupabaseConfigured(isSupabaseConfigured())
  }, [])

  // VÃ©rifier le rÃ´le et rediriger si pas admin
  useEffect(() => {
    if (!authLoading && user && !isAdminUser) {
      // Si l'utilisateur n'est pas admin, rediriger
      navigate('/auction')
    }
  }, [user, isAdminUser, authLoading, navigate])

  // VÃ©rifier le profil complet quand l'utilisateur change
  useEffect(() => {
    let mounted = true
    
    async function checkProfile() {
      if (user && mounted) {
        await checkProfileComplete(user.id)
      } else if (mounted) {
        setProfileComplete(false)
      }
    }
    
    checkProfile()
    
    return () => {
      mounted = false
    }
  }, [user])

  // VÃ©rifier le statut de l'enchÃ¨re et les nouvelles enchÃ¨res
  useEffect(() => {
    let mounted = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function init() {
      if (!isSupabaseConfigured()) {
        console.warn('Supabase not configured')
        return
      }

      if (!mounted) return

      // L'utilisateur est maintenant gÃ©rÃ© par le contexte AuthContext
      // Le profil complet est vÃ©rifiÃ© dans un useEffect sÃ©parÃ©

      // Subscribe to auction room status
      supabase
        .channel('auction-room-status')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'auction_rooms',
            filter: `name=eq.${room}`,
          },
          (payload: any) => {
            if (!mounted) return
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
          (payload: any) => {
            if (!mounted) return
            const newBid = payload.new as Bid
            setBids((prev) => [...prev, newBid])
            setCurrentBid((current) =>
              newBid.amount > (current.amount || 0)
                ? { amount: newBid.amount, bidder: newBid.bidder }
                : current
            )
            setLastBidTime(new Date())
            // RÃ©initialiser le timer de clÃ´ture automatique
            resetAutoCloseTimer()
          }
        )
        .subscribe((status: string) => {
          if (mounted) {
            setConnected(status === 'SUBSCRIBED')
          }
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
          // CrÃ©er la salle si elle n'existe pas
          await supabase.from('auction_rooms').insert({
            name: room,
            description: 'Salle d\'enchÃ¨res principale',
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
            (max: Bid, b: Bid) => (b.amount > max.amount ? b : max),
            { id: '', room: '', amount: startingPrice, bidder: '', inserted_at: new Date().toISOString() } as Bid
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
      mounted = false
      if (channel) {
        supabase.removeChannel(channel)
      }
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current)
        autoCloseTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room, startingPrice])

  // Fonction pour fermer l'enchÃ¨re (sans confirmation pour le timer automatique)
  const closeAuctionWithoutConfirm = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('auction_rooms')
        .update({ status: 'ended', ends_at: new Date().toISOString() })
        .eq('name', room)

      if (error) throw error
      setAuctionStatus('ended')
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current)
        autoCloseTimerRef.current = null
      }
      showSuccess('Vente aux enchÃ¨res clÃ´turÃ©e automatiquement aprÃ¨s 30 secondes sans enchÃ¨re!')
    } catch (err: any) {
      console.error('Failed to close auction:', err)
      showError(err.message || 'Erreur lors de la clÃ´ture')
    }
  }, [room, showSuccess, showError])

  // Timer de clÃ´ture automatique
  const resetAutoCloseTimer = useCallback(() => {
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current)
      autoCloseTimerRef.current = null
    }

    if (auctionStatus === 'active') {
      autoCloseTimerRef.current = setTimeout(() => {
        closeAuctionWithoutConfirm()
      }, AUTO_CLOSE_DELAY)
    }
  }, [auctionStatus, closeAuctionWithoutConfirm])

  useEffect(() => {
    if (auctionStatus === 'active' && lastBidTime) {
      resetAutoCloseTimer()
    }
    return () => {
      if (autoCloseTimerRef.current) {
        clearTimeout(autoCloseTimerRef.current)
        autoCloseTimerRef.current = null
      }
    }
  }, [auctionStatus, lastBidTime, resetAutoCloseTimer])

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
        showSuccess('Diffusion dÃ©marrÃ©e avec succÃ¨s!')
      }
    } catch (err) {
      console.error('Error accessing media devices:', err)
      showError('Impossible d\'accÃ©der Ã  la camÃ©ra/microphone. VÃ©rifiez les permissions.')
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
    showInfo('Diffusion arrÃªtÃ©e')
  }

  async function handleCloseAuction() {
    if (!window.confirm('ÃŠtes-vous sÃ»r de vouloir clÃ´turer cette vente aux enchÃ¨res ?')) {
      return
    }

    // Annuler le timer automatique si prÃ©sent
    if (autoCloseTimerRef.current) {
      clearTimeout(autoCloseTimerRef.current)
      autoCloseTimerRef.current = null
    }

    try {
      const { error } = await supabase
        .from('auction_rooms')
        .update({ status: 'ended', ends_at: new Date().toISOString() })
        .eq('name', room)

      if (error) throw error

      setAuctionStatus('ended')
      showSuccess('Vente aux enchÃ¨res clÃ´turÃ©e avec succÃ¨s!')
    } catch (err: any) {
      console.error('Failed to close auction:', err)
      showError(err.message || 'Erreur lors de la clÃ´ture')
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
      showInfo('Vente aux enchÃ¨res mise en pause')
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
      showSuccess('Vente aux enchÃ¨res reprise avec succÃ¨s!')
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

  async function handleAuthSuccess(authUser: User) {
    // RafraÃ®chir l'utilisateur dans le contexte
    await refreshUser()
    if (authUser) {
      await checkProfileComplete(authUser.id)
    }
  }

  function handleProfileComplete() {
    setProfileComplete(true)
    setIsProfileModalOpen(false)
  }

  async function handleSignOut() {
    try {
      await handleStopStream()
      await authSignOut()
      navigate('/auction')
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
            <h2 className="text-xl font-bold text-red-800 mb-2">âš ï¸ Configuration Supabase requise</h2>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Panneau Commissaire-Priseur</h1>
              <p className="text-sm text-gray-600 mt-1">Gestion de la vente aux enchÃ¨res</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {connected ? 'ConnectÃ©' : 'DÃ©connectÃ©'}
                </span>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-semibold ${
                auctionStatus === 'active' ? 'bg-green-100 text-green-800' :
                auctionStatus === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {auctionStatus === 'active' ? 'ACTIVE' : auctionStatus === 'paused' ? 'EN PAUSE' : 'TERMINÃ‰E'}
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
                  onClick={() => navigate('/profile')}
                  className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-medium text-sm transition-colors border border-blue-200"
                >
                  Mon profil
                </button>
                <button
                  onClick={handleSignOut}
                  className="px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium text-sm transition-colors border border-red-200"
                >
                  Se dÃ©connecter
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Connectez-vous pour accÃ©der au panneau d&apos;administration
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
                  ðŸŽ¥ DÃ©marrer la diffusion
                </button>
              ) : (
                <button
                  onClick={handleStopStream}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                >
                  â¹ï¸ ArrÃªter la diffusion
                </button>
              )}
            </div>
          </div>

          {/* Control Panel */}
          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl shadow-xl p-6 flex flex-col">
            <div className="mb-6">
              <div className="text-xs text-gray-600 mb-1">Prix actuel</div>
              <div className="text-4xl font-bold text-gray-800">{currentBid.amount} â‚¬</div>
              <div className="text-sm text-gray-600 mt-1">
                {currentBid.bidder ? `par ${currentBid.bidder}` : "Pas d'enchÃ¨re"}
              </div>
            </div>

            <div className="space-y-3 mb-6">
              {auctionStatus === 'active' && (
                <>
                  <button
                    onClick={handlePauseAuction}
                    className="w-full px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 font-medium transition-colors"
                  >
                    â¸ï¸ Mettre en pause
                  </button>
                  <button
                    onClick={handleCloseAuction}
                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                  >
                    ðŸ”’ ClÃ´turer la vente
                  </button>
                  {lastBidTime && (
                    <div className="text-xs text-gray-500 mt-2">
                      DerniÃ¨re enchÃ¨re: {new Date(lastBidTime).toLocaleTimeString()}
                    </div>
                  )}
                </>
              )}

              {auctionStatus === 'paused' && (
                <button
                  onClick={handleResumeAuction}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
                >
                  â–¶ï¸ Reprendre
                </button>
              )}

              {auctionStatus === 'ended' && (
                <div className="text-center text-gray-600 text-sm">
                  Vente terminÃ©e
                </div>
              )}
            </div>

            <div className="mt-auto">
              <div className="text-xs text-gray-600 mb-2">Historique rÃ©cent</div>
              <div className="overflow-auto space-y-2" style={{ maxHeight: '200px' }}>
                {bids.length === 0 && (
                  <div className="text-sm text-gray-400">Aucune enchÃ¨re</div>
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
                        {b.bidder} â€” {b.amount} â‚¬
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
          <h3 className="font-semibold text-lg mb-4">Toutes les enchÃ¨res</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-auto">
            {bids.length === 0 && (
              <div className="text-sm text-gray-400 col-span-full">Aucune enchÃ¨re enregistrÃ©e</div>
            )}
            {bids.map((bid) => (
              <div
                key={bid.id || bid.inserted_at}
                className="rounded-lg p-3 border border-gray-200 hover:border-purple-400 transition-colors"
              >
                <div className="text-xs text-gray-500 mb-1">
                  {bid.bidder} â€¢{' '}
                  <span className="text-[10px]">
                    {new Date(bid.inserted_at || Date.now()).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-lg font-bold text-purple-600">{bid.amount} â‚¬</div>
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


