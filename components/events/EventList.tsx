'use client'

import { Event } from '@/types'
import { EventCard } from './EventCard'
import { useRouter } from 'next/navigation'

interface EventListProps {
  events: Event[]
}

export function EventList({ events }: EventListProps) {
  const router = useRouter()

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          onClick={() => router.push(`/events/${event.id}`)}
        />
      ))}
      {events.length === 0 && (
        <div className="col-span-full text-center text-muted-foreground">
          No events found
        </div>
      )}
    </div>
  )
} 