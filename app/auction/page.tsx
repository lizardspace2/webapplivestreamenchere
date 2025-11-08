'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { LIVEPEER_CONFIG } from '@/lib/livepeer'
import AuthModal from '@/app/components/AuthModal'
import ProfileModal from '@/app/components/ProfileModal'
import Toast from '@/app/components/Toast'
import { useToast } from '@/app/hooks/useToast'
import { getUserRole } from '@/lib/user-role'
import type { User } from '@supabase/supabase-js'
import Hls from 'hls.js'
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

export default function AuctionPage() {
  const router = useRouter()
  const videoRef = useRef<HTMLVideoElement>(null)
  const { toast, showError, showWarning, showSuccess, hideToast } = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [userRole, setUserRole] = useState<'admin' | 'participant' | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [currentBid, setCurrentBid] = useState({ amount: 10, bidder: null as string | null })
  const [bidAmount, setBidAmount] = useState('')
  const [connected, setConnected] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [auctionStatus, setAuctionStatus] = useState<'active' | 'paused' | 'ended'>('active')
  const [supabaseConfigured, setSupabaseConfigured] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [profileComplete, setProfileComplete] = useState(false)

  const room = 'auction-room'
  const startingPrice = 10
  const minIncrement = 1

  // HLS playback setup
  useEffect(() => {
    let hls: Hls | null = null
    const video = videoRef.current
    if (!video) return

    if (Hls.isSupported()) {
      hls = new Hls({
        maxBufferLength: 3,
        maxMaxBufferLength: 5,
        startLevel: -1,
      })
      hls.loadSource(LIVEPEER_CONFIG.playbackUrl)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {})
      })
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = LIVEPEER_CONFIG.playbackUrl
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {})
      })
    } else {
      console.warn('HLS not supported in this browser')
    }

    return () => {
      if (hls) {
        hls.destroy()
      }
    }
  }, [])

  // Vérifier la configuration Supabase au montage
  useEffect(() => {
    setSupabaseConfigured(isSupabaseConfigured())
  }, [])

  // Vérifier le rôle et rediriger si admin
  useEffect(() => {
    async function checkRole() {
      if (user) {
        const role = await getUserRole(user)
        setUserRole(role)
        if (role === 'admin') {
          router.push('/admin')
        }
      }
    }
    checkRole()
  }, [user, router])

  // Supabase auth and realtime
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
    }
  }, [room, startingPrice])

  function computeMinAllowed(current: number, increment: number) {
    if (increment > 0 && increment < 1) {
      return Math.ceil((current || 0) * (1 + increment))
    }
    return (current || 0) + (increment || 1)
  }

  async function placeBid(e: React.FormEvent) {
    e.preventDefault()
    if (!user) {
      showWarning('Veuillez vous connecter pour enchérir.')
      return
    }

    if (auctionStatus !== 'active') {
      showWarning('Les enchères sont actuellement fermées.')
      return
    }

    const amount = Number(bidAmount)
    if (!amount || Number.isNaN(amount)) {
      showError('Montant invalide')
      return
    }

    const minAllowed = computeMinAllowed(currentBid.amount, minIncrement)
    if (amount < minAllowed) {
      showError(`Montant trop faible — minimum requis: ${minAllowed} €`)
      return
    }

    const bid = {
      room,
      bidder: user.email || 'unknown',
      amount,
      inserted_at: new Date().toISOString(),
    }

    try {
      const { error } = await supabase.from('bids').insert([bid])
      if (error) throw error
      setBidAmount('')
      showSuccess(`Enchère de ${amount} € placée avec succès!`)
    } catch (err: any) {
      console.error('Failed to insert bid', err)
      showError(err.message || 'Impossible de placer l\'enchère, réessayez.')
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
      await supabase.auth.signOut()
      setUser(null)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-7xl mx-auto">
        {!supabaseConfigured && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl shadow-xl p-6 mb-4">
            <h2 className="text-xl font-bold text-red-800 mb-2">⚠️ Configuration Supabase requise</h2>
            <p className="text-red-700 mb-4">
              Supabase n&apos;est pas configuré. Veuillez créer un fichier <code className="bg-red-100 px-2 py-1 rounded">.env.local</code> à la racine du projet avec vos credentials.
            </p>
          </div>
        )}

        {/* Status Banner */}
        {auctionStatus === 'ended' && (
          <div className="bg-red-100 border-2 border-red-400 rounded-2xl shadow-xl p-4 mb-4">
            <p className="text-red-800 font-semibold text-center">
              ⚠️ Les enchères sont terminées
            </p>
          </div>
        )}

        {auctionStatus === 'paused' && (
          <div className="bg-yellow-100 border-2 border-yellow-400 rounded-2xl shadow-xl p-4 mb-4">
            <p className="text-yellow-800 font-semibold text-center">
              ⏸️ Les enchères sont en pause
            </p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Enchères Live Stream</h1>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-sm text-gray-600">
                  {connected ? 'Connecté' : 'Déconnecté'}
                </span>
              </div>
            </div>
          </div>

          {/* Auth Section */}
          {user ? (
            <div className="flex items-center justify-between bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {user.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-800">{user.email}</div>
                  <div className="text-xs text-gray-500">Participant</div>
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
                    Connectez-vous pour placer des enchères
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Créez un compte ou connectez-vous avec votre e-mail
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
          {/* Video Player */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl p-4">
            <div className="relative w-full bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                controls
                playsInline
                className="w-full h-auto"
                style={{ aspectRatio: '16/9' }}
              />
            </div>
          </div>

          {/* Bidding Panel */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl shadow-xl p-6 flex flex-col">
            <div className="mb-6">
              <div className="text-xs text-gray-600 mb-1">Prix actuel</div>
              <div className="text-4xl font-bold text-gray-800">{currentBid.amount} €</div>
              <div className="text-sm text-gray-600 mt-1">
                {currentBid.bidder ? `par ${currentBid.bidder}` : "Pas d'enchère"}
              </div>
            </div>

            <form onSubmit={placeBid} className="mt-auto">
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Votre offre (min {computeMinAllowed(currentBid.amount, minIncrement)} €)
              </label>
              <div className="flex gap-2">
                <input
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  type="number"
                  step="0.01"
                  min={computeMinAllowed(currentBid.amount, minIncrement)}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Montant"
                  disabled={auctionStatus !== 'active'}
                />
                <button
                  type="submit"
                  disabled={!user || auctionStatus !== 'active'}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  Enchérir
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="text-xs text-gray-600 mb-2">Historique récent</div>
              <div className="overflow-auto space-y-2" style={{ maxHeight: '200px' }}>
                {bids.length === 0 && (
                  <div className="text-sm text-gray-400">Aucune enchère pour l&apos;instant</div>
                )}
                {bids
                  .slice(-20)
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
          <h3 className="font-semibold text-lg mb-4">Flux d&apos;enchères en direct</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-auto">
            {bids.length === 0 && (
              <div className="text-sm text-gray-400 col-span-full">Aucune enchère enregistrée</div>
            )}
            {bids.map((bid) => (
              <div
                key={bid.id || bid.inserted_at}
                className="rounded-lg p-3 border border-gray-200 hover:border-green-400 transition-colors"
              >
                <div className="text-xs text-gray-500 mb-1">
                  {bid.bidder} •{' '}
                  <span className="text-[10px]">
                    {new Date(bid.inserted_at || Date.now()).toLocaleTimeString()}
                  </span>
                </div>
                <div className="text-lg font-bold text-green-600">{bid.amount} €</div>
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

