'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { EventForm } from '@/components/events/EventForm'
import { supabase } from '@/lib/supabaseClient'

export default function CreateEventPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
        return
      }
      setUserId(session.user.id)
    })
  }, [router])

  if (!userId) {
    return <div className="text-center">Loading...</div>
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Create Event</h1>
      <EventForm userId={userId} />
    </div>
  )
} 