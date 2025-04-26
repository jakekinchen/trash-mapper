'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'
import { TrashIcon } from './trash-icon'
import { Button } from "@/components/ui/button"
import { Menu } from 'lucide-react'

export function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => {
      authListener?.subscription.unsubscribe()
    }
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="sticky top-0 z-50 w-full sage-gradient text-white shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3">
          <div className="bg-white/20 p-2.5 rounded-full flex items-center justify-center">
            <TrashIcon className="h-6 w-6 text-white trash-icon" />
          </div>
          <span className="text-xl font-bold tracking-wide">Trash Mapper ATX</span>
        </Link>
        <div className="flex items-center space-x-4">
          {loading ? (
            <span className="text-sm animate-pulse">...</span>
          ) : user ? (
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-6 w-6" />
            </Button>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium hover:underline"
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="text-sm font-medium hover:underline"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
} 