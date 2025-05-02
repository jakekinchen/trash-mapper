'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare } from 'lucide-react'
import { useToast } from "@/components/ui/use-toast"

export function FeedbackModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState('')
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/send-feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      })

      if (!response.ok) {
        throw new Error('Failed to send feedback')
      }

      toast({
        title: "Feedback sent!",
        description: "Thank you for your feedback. We'll get back to you soon.",
      })
      setIsOpen(false)
      setMessage('')
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send feedback. Please try again later.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Feedback
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
          <DialogDescription>
            Have suggestions or found a bug? Let us know!
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Textarea
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            className="min-h-[150px]"
          />
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Sending...' : 'Send Feedback'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
} 