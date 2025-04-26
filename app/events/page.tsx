import { Calendar, Clock, MapPin, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

// This would come from an API in a real application
const events = [
  {
    id: "1",
    title: "Beach Cleanup",
    organization: "Ocean Conservancy",
    date: "2023-05-15",
    time: "9:00 AM - 12:00 PM",
    location: "Main Beach",
    address: "123 Beach Dr, Oceanside",
    attendees: 24,
    description: "Join us for our monthly beach cleanup! We'll provide gloves, bags, and refreshments.",
    tags: ["beach", "volunteer", "family-friendly"],
  },
  {
    id: "2",
    title: "Park Restoration",
    organization: "City Parks Department",
    date: "2023-05-20",
    time: "10:00 AM - 2:00 PM",
    location: "Central Park",
    address: "456 Park Ave, Downtown",
    attendees: 12,
    description:
      "Help us restore our city's central park. Activities include trash pickup, planting, and trail maintenance.",
    tags: ["park", "planting", "restoration"],
  },
  {
    id: "3",
    title: "River Cleanup",
    organization: "Waterkeeper Alliance",
    date: "2023-05-27",
    time: "8:00 AM - 1:00 PM",
    location: "Riverside Park",
    address: "789 River Rd, Riverside",
    attendees: 18,
    description: "Help us clean up the river and surrounding areas. Kayaks available for in-water cleanup.",
    tags: ["river", "kayaking", "volunteer"],
  },
]

export default function EventsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cleanup Events</h1>
          <p className="text-muted-foreground mt-1">Join community events to help clean up pollution</p>
        </div>
        <Button>Back to Map</Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {events.map((event) => (
          <Card key={event.id}>
            <CardHeader>
              <CardTitle>{event.title}</CardTitle>
              <CardDescription>{event.organization}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {new Date(event.date).toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{event.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {event.location} - {event.address}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{event.attendees} attendees</span>
                </div>
                <p className="text-sm text-muted-foreground">{event.description}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {event.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full">Register</Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
