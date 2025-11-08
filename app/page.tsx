'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { LIVEPEER_CONFIG } from '@/lib/livepeer'
import type { User } from '@supabase/supabase-js'
import Hls from 'hls.js'

// Désactiver le pré-rendu statique
export const dynamic = 'force-dynamic'

interface Bid {
  id: string
  room: string
  bidder: string
  amount: number
  inserted_at: string
  user_email?: string
}

export default function LiveAuctionPage() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [user, setUser] = useState<User | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [currentBid, setCurrentBid] = useState({ amount: 10, bidder: null as string | null })
  const [bidAmount, setBidAmount] = useState('')
  const [connected, setConnected] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [auctionEndsAt] = useState<Date | null>(null) // Set this to enable timer

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
        // Configuration pour faible latence
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

  // Auction timer
  useEffect(() => {
    if (!auctionEndsAt) return
    const endTime = auctionEndsAt
    function update() {
      const diff = Math.max(0, endTime.getTime() - Date.now())
      setTimeLeft(diff)
    }
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [auctionEndsAt])

  function formatTime(ms: number | null) {
    if (ms === null) return '--'
    const s = Math.floor(ms / 1000)
    const hh = Math.floor(s / 3600)
    const mm = Math.floor((s % 3600) / 60)
    const ss = s % 60
    if (hh > 0) return `${hh}h ${mm}m ${ss}s`
    return `${mm}m ${ss}s`
  }

  // Supabase auth and realtime
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null

    async function init() {
      // Vérifier que Supabase est configuré
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.warn('Supabase not configured')
        return
      }

      // Get current user
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } catch (e) {
        console.warn('Failed to get user', e)
      }

      // Auth state change listener
      supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null)
      })

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
      alert('Veuillez vous connecter pour enchérir.')
      return
    }

    const amount = Number(bidAmount)
    if (!amount || Number.isNaN(amount)) {
      alert('Montant invalide')
      return
    }

    const minAllowed = computeMinAllowed(currentBid.amount, minIncrement)
    if (amount < minAllowed) {
      alert(`Montant trop faible — minimum requis: ${minAllowed} €`)
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
    } catch (err: any) {
      console.error('Failed to insert bid', err)
      alert(err.message || 'Impossible de placer l\'enchère, réessayez.')
    }
  }

  async function signIn(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      setEmail('')
      setPassword('')
      setIsSignUp(false)
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) throw error
      alert('Vérifiez votre e-mail pour confirmer votre compte.')
      setEmail('')
      setPassword('')
      setIsSignUp(false)
    } catch (err: any) {
      console.error(err)
      alert(err.message || 'Erreur d\'inscription')
    } finally {
      setLoading(false)
    }
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
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Enchères Live Stream</h1>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-gray-600">
                {connected ? 'Connecté' : 'Déconnecté'}
              </span>
            </div>
          </div>

          {/* Auth Section */}
          {user ? (
            <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
              <div className="text-sm">
                <span className="font-medium">Connecté:</span> {user.email}
              </div>
              <button
                onClick={signOut}
                className="text-red-600 text-sm hover:text-red-700 font-medium"
              >
                Se déconnecter
              </button>
            </div>
          ) : (
            <div className="bg-blue-50 p-4 rounded-lg">
              <form onSubmit={isSignUp ? signUp : signIn} className="flex flex-col sm:flex-row gap-2">
                <input
                  className="border border-gray-300 p-2 rounded flex-1"
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <input
                  className="border border-gray-300 p-2 rounded flex-1"
                  type="password"
                  placeholder="Mot de passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSignUp ? 'S\'inscrire' : 'Connexion'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  {isSignUp ? 'Déjà un compte ?' : 'Créer un compte'}
                </button>
              </form>
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

            {auctionEndsAt && (
              <div className="mb-6">
                <div className="text-xs text-gray-600 mb-1">Temps restant</div>
                <div className="text-xl font-medium text-gray-800">{formatTime(timeLeft)}</div>
              </div>
            )}

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
                />
                <button
                  type="submit"
                  disabled={!user}
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
    </div>
  )
}

