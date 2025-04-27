'use client'

import { Event } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { MapPin, Calendar, Clock } from 'lucide-react'

interface EventCardProps {
  event: Event
  onClick?: () => void
}

export function EventCard({ event, onClick }: EventCardProps) {
  console.log(event.location)
  return (
    <Card 
      className="cursor-pointer hover:shadow-xl transition-shadow border-2 border-gray-100 rounded-2xl overflow-hidden bg-white"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-xl font-bold mb-1">{event.title}</CardTitle>
        {event.description && (
          <CardDescription className="mb-1 text-base text-gray-500">{event.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-blue-100 text-blue-700 rounded-full px-2 py-1 flex items-center font-medium"><Calendar className="h-4 w-4 mr-1" /> {format(new Date(event.start_time), 'MMMM d, yyyy')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-green-100 text-green-700 rounded-full px-2 py-1 flex items-center font-medium"><Clock className="h-4 w-4 mr-1" /> {format(new Date(event.start_time), 'h:mm a')} - {format(new Date(event.end_time), 'h:mm a')}</span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2 text-sm">
              <span className="bg-purple-100 text-purple-700 rounded-full px-2 py-1 flex items-center font-medium"><MapPin className="h-4 w-4 mr-1" /> {event.location}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 