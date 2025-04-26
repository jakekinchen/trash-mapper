'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'
import { TrashIcon } from './trash-icon'
import { Button } from "@/components/ui/button"
import { Menu, LogOut } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet"
import { useDrawer } from '@/lib/drawer-context'

export function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { isDrawerOpen, setIsDrawerOpen } = useDrawer()

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
    <nav 
      className="sticky top-0 z-50 w-full text-white shadow-md"
      style={{ backgroundColor: '#8FBC8F' }}
    >
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
            <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
              <SheetTrigger asChild>
                <button 
                  className="flex items-center justify-center rounded-lg p-2 hover:bg-white/10 transition-colors"
                  style={{ minWidth: '48px', minHeight: '48px' }}
                >
                  <Menu strokeWidth={3} style={{ width: '32px', height: '32px' }} />
                </button>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription>
                    Navigate through your account sections.
                  </SheetDescription>
                </SheetHeader>
                <div className="grid gap-4 py-4">
                  <SheetClose asChild>
                     <Link href="/profile" className="text-sm font-medium hover:underline">
                      Profile
                    </Link>
                  </SheetClose>
                   <SheetClose asChild>
                    <Link href="/reports" className="text-sm font-medium hover:underline">
                      Reports
                    </Link>
                  </SheetClose>
                   <SheetClose asChild>
                    <Link href="/events" className="text-sm font-medium hover:underline">
                      Events
                    </Link>
                  </SheetClose>
                </div>
                <SheetClose asChild>
                  <Button onClick={handleLogout} variant="outline" className="w-full mt-4">
                     <LogOut className="mr-2 h-4 w-4" /> Logout
                  </Button>
                </SheetClose>
              </SheetContent>
            </Sheet>
          ) : (
            <Link
              href="/login"
              className="flex items-center justify-center p-2 hover:opacity-80 transition-opacity"
            >
              <Image src="/login.svg" alt="Login" width={32} height={32} className="brightness-0 invert" />
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
} 