import { createBrowserClient } from '@supabase/ssr'

export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://example.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'local-build-placeholder-key'

// Note: Using createBrowserClient singleton pattern is recommended if used across multiple components
// See: https://supabase.com/docs/guides/auth/server-side/nextjs#creating-a-client
export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
)
