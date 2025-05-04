import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import { User } from '@supabase/supabase-js' // Import User type

export default function useCurrentUser() {
  const [userId, setUserId] = useState<string | null>(null)
  const [user, setUser] = useState<User | null>(null) // Add state for full user object
  const [loading, setLoading] = useState(true); // Add loading state

  useEffect(() => {
    let isMounted = true; // Prevent state update on unmounted component
    setLoading(true);
    
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (isMounted) {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            setUserId(currentUser?.id ?? null);
            setLoading(false);
        }
    }).catch(error => {
        console.error("Error getting initial session:", error);
        if(isMounted) setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (isMounted) {
            const currentUser = session?.user ?? null;
            setUser(currentUser);
            setUserId(currentUser?.id ?? null);
             // Consider setting loading false only on first auth state change if needed
            // setLoading(false);
        }
      }
    )

    return () => {
      isMounted = false;
      authListener?.subscription.unsubscribe()
    }
  }, [])

  return { userId, user, loading } // Return userId, user object, and loading state
} 