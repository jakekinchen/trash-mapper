import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string

// Note: Using createBrowserClient singleton pattern is recommended if used across multiple components
// See: https://supabase.com/docs/guides/auth/server-side/nextjs#creating-a-client
export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
)