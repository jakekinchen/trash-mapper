'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Event } from '@/types'
import { createEvent, updateEvent } from '@/lib/events'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'

interface EventFormProps {
  event?: Event
  userId: string
}

export function EventForm({ event, userId }: EventFormProps) {
  const router = useRouter()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    title: event?.title || '',
    description: event?.description || '',
    location: event?.location || '',
    start_time: event?.start_time ? new Date(event.start_time).toISOString().slice(0, 16) : '',
    end_time: event?.end_time ? new Date(event.end_time).toISOString().slice(0, 16) : '',
    is_public: event?.is_public ?? true,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const eventData = {
        ...formData,
        organizer_id: userId,
      }

      if (event) {
        await updateEvent(event.id, eventData)
        toast({
          title: 'Event updated',
          description: 'Your event has been updated successfully.',
        })
      } else {
        await createEvent(eventData)
        toast({
          title: 'Event created',
          description: 'Your event has been created successfully.',
        })
      }

      router.push('/events')
      router.refresh()
    } catch (error) {
      console.error('Error saving event:', error)
      toast({
        title: 'Error',
        description: 'There was an error saving your event. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={4}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="start_time">Start Time</Label>
          <Input
            id="start_time"
            type="datetime-local"
            value={formData.start_time}
            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="end_time">End Time</Label>
          <Input
            id="end_time"
            type="datetime-local"
            value={formData.end_time}
            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="is_public"
          checked={formData.is_public}
          onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
        />
        <Label htmlFor="is_public">Make this event public</Label>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Saving...' : event ? 'Update Event' : 'Create Event'}
      </Button>
    </form>
  )
} 