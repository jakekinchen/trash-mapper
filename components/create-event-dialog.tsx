'use client'

import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from 'date-fns'
import { cn } from "@/lib/utils"
import { Calendar } from '@/components/ui/calendar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { createEvent } from '@/lib/events'
import { useToast } from '@/components/ui/use-toast'
import { supabase } from '@/lib/supabaseClient'

interface CreateEventDialogProps {
  onEventCreated?: () => void
  trigger?: React.ReactNode
}

export function CreateEventDialog({ onEventCreated, trigger }: CreateEventDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [date, setDate] = useState<Date>()
  const { toast } = useToast()

  useEffect(() => {
    const handleOpen = () => {
      console.log('Received openCreateEventDialog event');
      setOpen(true);
    };

    window.addEventListener('openCreateEventDialog', handleOpen);

    return () => {
      window.removeEventListener('openCreateEventDialog', handleOpen);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!date) {
      toast({
        title: 'Error',
        description: 'Please select a date',
        variant: 'destructive',
      })
      return
    }

    const formData = new FormData(e.currentTarget)
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: 'Error',
          description: 'You must be logged in to create an event',
          variant: 'destructive',
        })
        setLoading(false);
        return
      }

      const timeStart = formData.get('time_start') as string
      const timeEnd = formData.get('time_end') as string
      
      if (!date) { throw new Error("Date is not selected"); }
      const eventDate = format(date, 'yyyy-MM-dd')
      
      const startTime = new Date(`${eventDate}T${timeStart}`).toISOString()
      const endTime = new Date(`${eventDate}T${timeEnd}`).toISOString()

      if (new Date(endTime) <= new Date(startTime)) {
        toast({
          title: 'Error',
          description: 'End time must be after start time',
          variant: 'destructive',
        })
        setLoading(false);
        return
      }

      await createEvent({
        title: formData.get('title') as string,
        description: formData.get('description') as string || null,
        start_time: startTime,
        end_time: endTime,
        location: formData.get('location') as string || null,
        is_public: formData.get('is_public') === 'on',
        organizer_id: user.id
      })

      toast({
        title: 'Success',
        description: 'Event created successfully',
      })
      setOpen(false)
      onEventCreated?.()
    } catch (error) {
      console.error('Error creating event:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create event. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || <Button variant="outline" className="hidden">Trigger</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[90dvh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Event</DialogTitle>
            <DialogDescription>
              Let&apos;s go pick up some trash! Create a new cleanup event. Fill out the details below.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="Beach Cleanup"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Join us for our monthly beach cleanup!"
              />
            </div>
            <div className="grid gap-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="time_start">Start Time</Label>
                <Input
                  id="time_start"
                  name="time_start"
                  type="time"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="time_end">End Time</Label>
                <Input
                  id="time_end"
                  name="time_end"
                  type="time"
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                placeholder="Main Beach"
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="is_public" name="is_public" defaultChecked />
              <Label htmlFor="is_public">Public Event</Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Event'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
} 