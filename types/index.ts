export interface Event {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  location: string | null;
  is_public: boolean;
  organizer_id: string;
  created_at: string;
  updated_at: string;
}

export interface EventWithUser extends Event {
  user: {
    id: string;
    email: string;
  }
}

export interface EventAttendee {
  event_id: string;
  user_id: string;
  created_at: string;
  user?: {
    id: string;
    email: string;
  }
} 