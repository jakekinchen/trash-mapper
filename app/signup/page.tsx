'use client'

import { useState, FormEvent } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function SignUpPage() {
  const [email, setEmail] = useState<string>('')
  const [password, setPassword] = useState<string>('')

  const handleSignUp = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      console.error('Sign up error:', error.message)
    } else {
      console.log('Sign up success', data)
    }
  }

  return (
    <form onSubmit={handleSignUp}>
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button type="submit">Sign Up</button>
    </form>
  )
}