'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Event } from '@/types'
import { getMyCreatedEvents, getMyJoinedEvents, getPublicEvents } from '@/lib/events'
import { EventList } from '@/components/events/EventList'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from '@/lib/supabaseClient'

export default function EventsPage() {
  const [myEvents, setMyEvents] = useState<Event[]>([])
  const [joinedEvents, setJoinedEvents] = useState<Event[]>([])
  const [communityEvents, setCommunityEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState({
    my: true,
    joined: true,
    community: true
  })
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
  const router = useRouter()
  const { toast } = useToast()

  const loadMyEvents = useCallback(async () => {
    try {
      const data = await getMyCreatedEvents()
      setMyEvents(data)
    } catch (error) {
      console.error('Error loading my events:', error)
      toast({
        title: 'Error',
        description: 'Failed to load your events.',
        variant: 'destructive',
      })
    } finally {
      setLoading(prev => ({ ...prev, my: false }))
    }
  }, [toast])

  const loadJoinedEvents = useCallback(async () => {
    try {
      const data = await getMyJoinedEvents()
      setJoinedEvents(data)
    } catch (error) {
      console.error('Error loading joined events:', error)
      toast({
        title: 'Error',
        description: 'Failed to load joined events.',
        variant: 'destructive',
      })
    } finally {
      setLoading(prev => ({ ...prev, joined: false }))
    }
  }, [toast])

  const loadCommunityEvents = useCallback(async () => {
    try {
      const data = await getPublicEvents()
      setCommunityEvents(data)
    } catch (error) {
      console.error('Error loading community events:', error)
      toast({
        title: 'Error',
        description: 'Failed to load community events.',
        variant: 'destructive',
      })
    } finally {
      setLoading(prev => ({ ...prev, community: false }))
    }
  }, [toast])

  const checkAuth = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    setIsAuthenticated(!!session)
    if (session) {
      loadMyEvents()
      loadJoinedEvents()
    }
    loadCommunityEvents()
  }, [loadMyEvents, loadJoinedEvents, loadCommunityEvents])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Events</h1>
        {isAuthenticated && (
          <Button onClick={() => router.push('/events/create')}>
            <Plus className="mr-2 h-4 w-4" /> Create Event
          </Button>
        )}
      </div>
      
      <Tabs defaultValue="community" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          {isAuthenticated && (
            <>
              <TabsTrigger value="my">My Events</TabsTrigger>
              <TabsTrigger value="joined">Joined Events</TabsTrigger>
            </>
          )}
          <TabsTrigger value="community" className={isAuthenticated ? '' : 'col-span-3'}>
            Community Events
          </TabsTrigger>
        </TabsList>
        
        {isAuthenticated && (
          <>
            <TabsContent value="my">
              {loading.my ? (
                <div className="text-center">Loading your events...</div>
              ) : (
                <EventList events={myEvents} />
              )}
            </TabsContent>
            
            <TabsContent value="joined">
              {loading.joined ? (
                <div className="text-center">Loading joined events...</div>
              ) : (
                <EventList events={joinedEvents} />
              )}
            </TabsContent>
          </>
        )}
        
        <TabsContent value="community">
          {loading.community ? (
            <div className="text-center">Loading community events...</div>
          ) : (
            <EventList events={communityEvents} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
