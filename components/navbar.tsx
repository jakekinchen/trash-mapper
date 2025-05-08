'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { User } from '@supabase/supabase-js'
import { Button } from "@/components/ui/button"
import { Menu, LogOut, Map } from 'lucide-react'
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
import { FeedbackModal } from './feedback-modal'

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
      className="sticky top-0 z-50 w-full
    px-4 py-2 
    backdrop-blur-md
    bg-white/60
   text-white
    border-b border-white/20
    shadow-sm"
      style={{ backgroundColor: '#8FBC8F' }}
    >
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-3">
          <div className="bg-white/20 p-2 rounded-full flex items-center justify-center">
            <Image src="/temp-icon.png" alt="TrashMapperATX Logo" width={24} height={24} className="h-10 w-10 translate-y-0.5" />
          </div>
          <span className="text-xl font-bold tracking-wide">Trash Map ATX</span>
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
              <SheetContent side="right" className="rounded-lg">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                  <SheetDescription>
                    Navigate through your account sections.
                  </SheetDescription>
                </SheetHeader>
                <div className="py-4">
                  <nav className="flex flex-col gap-2">
                    <SheetClose asChild>
                      <Link href="/profile" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 hover:bg-primary/10 transition-colors font-medium text-base">
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Profile
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/reports" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 hover:bg-primary/10 transition-colors font-medium text-base">
                        <Image 
                          src="/notebook.svg" 
                          alt="Reports" 
                          width={20} 
                          height={20} 
                          style={{ filter: 'invert(77%) sepia(32%) saturate(1151%) hue-rotate(339deg) brightness(101%) contrast(101%)' }}
                        />
                        Reports
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/events" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 hover:bg-primary/10 transition-colors font-medium text-base">
                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        Events
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <Link href="/" className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 hover:bg-primary/10 transition-colors font-medium text-base">
                        <Map className="w-5 h-5 text-blue-600" />
                        Map
                      </Link>
                    </SheetClose>
                    <FeedbackModal />
                  </nav>
                  <div className="my-6 border-t border-gray-200" />
                  <SheetClose asChild>
                    <Button onClick={handleLogout} variant="destructive" className="w-full flex items-center justify-center gap-2 py-3 text-base font-semibold rounded-lg shadow-sm">
                      <LogOut className="h-5 w-5" /> Logout
                    </Button>
                  </SheetClose>
                </div>
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