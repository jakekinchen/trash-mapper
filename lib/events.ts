import { supabase } from './supabaseClient'
import { Event, EventAttendee } from '@/types'

// Define a type for the joined event data
interface EventWithAttendees extends Event {
  event_attendees: EventAttendee[];
}

export async function getEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .order('start_time', { ascending: true })

  if (error) throw error
  return data as Event[]
}

export async function getMyCreatedEvents() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('organizer_id', user.id)
    .order('start_time', { ascending: true })

  if (error) throw error
  return data as Event[]
}

export async function getMyJoinedEvents() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('events')
    .select('*, event_attendees!inner(*)')
    .eq('event_attendees.user_id', user.id)
    .order('start_time', { ascending: true })

  if (error) throw error
  return (data as EventWithAttendees[]).map(event => ({
    ...event,
    event_attendees: undefined // Remove the join data from the event object
  })) as Event[]
}

export async function getPublicEvents() {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('is_public', true)
    .order('start_time', { ascending: true })

  if (error) throw error
  return data as Event[]
}

export async function getEvent(id: string) {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data as Event
}

export async function createEvent(event: Omit<Event, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('events')
    .insert([event])
    .select()
    .single()

  if (error) throw error
  return data as Event
}

export async function updateEvent(id: string, event: Partial<Event>) {
  const { data, error } = await supabase
    .from('events')
    .update(event)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Event
}

export async function deleteEvent(id: string) {
  const { error } = await supabase
    .from('events')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function getEventAttendees(eventId: string) {
  const { data, error } = await supabase
    .from('event_attendees')
    .select('*, user:user_id(id, email)')
    .eq('event_id', eventId)

  if (error) throw error
  return data as EventAttendee[]
}

export async function registerForEvent(eventId: string, userId: string) {
  const { data, error } = await supabase
    .from('event_attendees')
    .insert([{ event_id: eventId, user_id: userId }])
    .select()
    .single()

  if (error) throw error
  return data as EventAttendee
}

export async function unregisterFromEvent(eventId: string, userId: string) {
  const { error } = await supabase
    .from('event_attendees')
    .delete()
    .eq('event_id', eventId)
    .eq('user_id', userId)

  if (error) throw error
}

export async function isUserRegistered(eventId: string, userId: string) {
  const { data, error } = await supabase
    .from('event_attendees')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single()

  if (error && error.code !== 'PGRST116') throw error // PGRST116 is the "not found" error
  return !!data
} 