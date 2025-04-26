'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Event, EventAttendee } from '@/types'
import { getEvent, getEventAttendees, registerForEvent, unregisterFromEvent, isUserRegistered } from '@/lib/events'
import { supabase } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { format } from 'date-fns'
import { Calendar, Clock, MapPin, Users } from 'lucide-react'

interface Props {
  params: {
    id: string
  }
}

export default function EventPage({ params }: Props) {
  const router = useRouter()
  const { toast } = useToast()
  const [event, setEvent] = useState<Event | null>(null)
  const [attendees, setAttendees] = useState<EventAttendee[]>([])
  const [isAttending, setIsAttending] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadEventData = useCallback(async () => {
    try {
      const eventData = await getEvent(params.id)
      setEvent(eventData)
      const attendeesData = await getEventAttendees(params.id)
      setAttendees(attendeesData)
    } catch (error) {
      console.error('Error loading event:', error)
      toast({
        title: 'Error',
        description: 'Failed to load event details.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }, [params.id, toast])

  const checkAttendance = useCallback(async (currentUserId: string) => {
    try {
      const attending = await isUserRegistered(params.id, currentUserId)
      setIsAttending(attending)
    } catch (error) {
      console.error('Error checking attendance:', error)
    }
  }, [params.id])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUserId(session.user.id)
        checkAttendance(session.user.id)
      }
      loadEventData()
    })
  }, [checkAttendance, loadEventData])

  async function handleAttendance() {
    if (!userId) {
      router.push('/login')
      return
    }

    try {
      if (isAttending) {
        await unregisterFromEvent(params.id, userId)
        setIsAttending(false)
        toast({
          title: 'Success',
          description: 'You have unregistered from the event.',
        })
      } else {
        await registerForEvent(params.id, userId)
        setIsAttending(true)
        toast({
          title: 'Success',
          description: 'You have registered for the event.',
        })
      }
      loadEventData()
    } catch (error) {
      console.error('Error updating attendance:', error)
      toast({
        title: 'Error',
        description: 'Failed to update registration.',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return <div className="text-center">Loading event details...</div>
  }

  if (!event) {
    return <div className="text-center">Event not found</div>
  }

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{event.title}</h1>
            <p className="text-muted-foreground mt-2">{event.description}</p>
          </div>
          {userId !== event.organizer_id && (
            <Button onClick={handleAttendance} variant={isAttending ? "outline" : "default"}>
              {isAttending ? 'Unregister' : 'Register'}
            </Button>
          )}
        </div>

        <div className="grid gap-4 bg-muted p-6 rounded-lg">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span>{format(new Date(event.start_time), 'EEEE, MMMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span>
              {format(new Date(event.start_time), 'h:mm a')} - {format(new Date(event.end_time), 'h:mm a')}
            </span>
          </div>
          {event.location && (
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground" />
              <span>{event.location}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-muted-foreground" />
            <span>{attendees.length} attendees</span>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Attendees</h2>
          <div className="grid gap-2">
            {attendees.map((attendee) => (
              <div key={attendee.user_id} className="flex items-center gap-2">
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                  {attendee.user?.email?.[0].toUpperCase()}
                </div>
                <span>{attendee.user?.email}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 