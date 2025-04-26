'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Event } from '@/types'
import { getEvents } from '@/lib/events'
import { EventList } from '@/components/events/EventList'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { toast } = useToast()

  useEffect(() => {
    loadEvents()
  }, [])

  async function loadEvents() {
    try {
      const data = await getEvents()
      setEvents(data)
    } catch (error) {
      console.error('Error loading events:', error)
      toast({
        title: 'Error',
        description: 'Failed to load events. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center">Loading events...</div>
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Events</h1>
        <Button onClick={() => router.push('/events/create')}>
          <Plus className="mr-2 h-4 w-4" /> Create Event
        </Button>
      </div>
      <EventList events={events} />
    </div>
  )
}
