'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getUserRole } from '@/lib/user-role'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export default function HomePage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Rediriger selon le rôle avec timeout de sécurité
  useEffect(() => {
    let mounted = true
    let redirectTimeout: NodeJS.Timeout

    // Timeout de sécurité : rediriger après 2 secondes maximum
    redirectTimeout = setTimeout(() => {
      if (mounted) {
        console.log('Timeout reached, redirecting to auction')
        setLoading(false)
        router.replace('/auction')
      }
    }, 2000)

    async function checkAndRedirect() {
      try {
        console.log('Checking user and role...')
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          console.warn('Auth error:', authError)
        }
        
        if (!mounted) return
        
        setUser(user)
        
        // Rediriger immédiatement vers /auction par défaut
        let targetRoute = '/auction'
        
        if (user) {
          console.log('User found, checking role...', user.id)
          try {
            const role = await getUserRole(user)
            console.log('User role:', role)
            if (role === 'admin') {
              targetRoute = '/admin'
            }
          } catch (roleError) {
            console.error('Error getting role:', roleError)
            // En cas d'erreur, on reste sur /auction
          }
        } else {
          console.log('No user, redirecting to auction')
        }
        
        if (!mounted) return
        
        // Annuler le timeout car on redirige maintenant
        clearTimeout(redirectTimeout)
        setLoading(false)
        router.replace(targetRoute)
      } catch (e) {
        console.error('Failed to check user:', e)
        if (!mounted) return
        clearTimeout(redirectTimeout)
        setLoading(false)
        router.replace('/auction')
      }
    }

    checkAndRedirect()

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return
      console.log('Auth state changed:', _event)
      setUser(session?.user ?? null)
      
      let targetRoute = '/auction'
      if (session?.user) {
        try {
          const role = await getUserRole(session.user)
          if (role === 'admin') {
            targetRoute = '/admin'
          }
        } catch (e) {
          console.error('Error getting role on auth change:', e)
        }
      }
      
      if (!mounted) return
      clearTimeout(redirectTimeout)
      setLoading(false)
      router.replace(targetRoute)
    })

    return () => {
      mounted = false
      clearTimeout(redirectTimeout)
      subscription.unsubscribe()
    }
  }, [router])

  if (loading) {
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-gray-600">Redirection en cours...</p>
      </div>
    </div>
  )
}

