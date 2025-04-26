import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  // Create a server client configured to use cookies
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          // @ts-expect-error Linter incorrectly thinks cookieStore is a Promise
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            // @ts-expect-error Linter incorrectly thinks cookieStore is a Promise
            cookieStore.set({ name, value, ...options })
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (_error) { // Prefix unused variable with underscore
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            // @ts-expect-error Linter incorrectly thinks cookieStore is a Promise
            cookieStore.set({ name, value: '', ...options })
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (_error) { // Prefix unused variable with underscore
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
} 