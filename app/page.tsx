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

  // Rediriger selon le rôle
  useEffect(() => {
    async function checkAndRedirect() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        
        if (user) {
          const role = await getUserRole(user)
          if (role === 'admin') {
            router.push('/admin')
          } else {
            router.push('/auction')
          }
        } else {
          router.push('/auction')
        }
      } catch (e) {
        console.warn('Failed to check user:', e)
        router.push('/auction')
      } finally {
        setLoading(false)
      }
    }

    checkAndRedirect()

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        const role = await getUserRole(session.user)
        if (role === 'admin') {
          router.push('/admin')
        } else {
          router.push('/auction')
        }
      } else {
        router.push('/auction')
      }
    })

    return () => {
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

