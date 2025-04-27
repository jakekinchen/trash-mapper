import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabaseServer' // Import the server client utility

export default async function DashboardPage() {
  const supabase = await createClient() // Use the server client factory

  const { data, error } = await supabase.auth.getUser()

  // Middleware should handle the redirect, but this is a safety check
  if (error || !data?.user) {
    console.error('Auth error or no user found in Server Component, redirecting.', error)
    redirect('/login')
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>
      <p>Welcome back, {data.user.email}!</p>
      <p>This page is protected and requires authentication.</p>
      <p>(Fetched on the server)</p>
    </div>
  )
} 