import { User } from '@supabase/supabase-js'

export interface Event {
  id: string
  title: string
  description: string | null
  date: string
  time_start: string
  time_end: string
  location: string
  address: string
  organizer_id: string
  is_public: boolean
  max_attendees: number | null
  created_at: string
  updated_at: string
}

export interface EventWithAttendees extends Event {
  attendees: User[]
  attendee_count: number
  is_attending?: boolean
  is_organizer?: boolean
}

export interface EventAttendee {
  event_id: string
  user_id: string
  created_at: string
}

export interface CreateEventData {
  title: string
  description?: string
  date: string
  time_start: string
  time_end: string
  location: string
  address: string
  is_public: boolean
  max_attendees?: number
} 