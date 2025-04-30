'use client'

import { Event } from '@/types'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { format, isPast } from 'date-fns'
import { MapPin, Calendar, Clock, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface EventCardProps {
  event: Event
  onClick?: () => void
}

export function EventCard({ event, onClick }: EventCardProps) {
  const isEventPast = isPast(new Date(event.end_time))
  
  return (
    <Card 
      className={`transition-shadow border-2 rounded-2xl overflow-hidden ${
        isEventPast 
          ? 'border-gray-200 bg-gray-50' 
          : 'border-gray-100 bg-white cursor-pointer hover:shadow-xl'
      }`}
      onClick={isEventPast ? undefined : onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-xl font-bold mb-1">{event.title}</CardTitle>
          {isEventPast && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Completed
            </Badge>
          )}
        </div>
        {event.description && (
          <CardDescription className="mb-1 text-base text-gray-500">{event.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm">
            <span className={`rounded-full px-2 py-1 flex items-center font-medium ${
              isEventPast 
                ? 'bg-gray-100 text-gray-700' 
                : 'bg-blue-100 text-blue-700'
            }`}>
              <Calendar className="h-4 w-4 mr-1" /> 
              {format(new Date(event.start_time), 'MMMM d, yyyy')}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className={`rounded-full px-2 py-1 flex items-center font-medium ${
              isEventPast 
                ? 'bg-gray-100 text-gray-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              <Clock className="h-4 w-4 mr-1" /> 
              {format(new Date(event.start_time), 'h:mm a')} - {format(new Date(event.end_time), 'h:mm a')}
            </span>
          </div>
          {event.location && (
            <div className="flex items-center gap-2 text-sm">
              <span className={`rounded-full px-2 py-1 flex items-center font-medium ${
                isEventPast 
                  ? 'bg-gray-100 text-gray-700' 
                  : 'bg-purple-100 text-purple-700'
              }`}>
                <MapPin className="h-4 w-4 mr-1" /> 
                {event.location}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
} 