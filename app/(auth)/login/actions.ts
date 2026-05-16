'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type ActionState = { error?: string; success?: string } | null

export async function loginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}

export async function magicLinkAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = formData.get('email') as string
  if (!email) return { error: 'Email is required.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  })

  if (error) return { error: error.message }

  return { success: `Magic link sent to ${email}. Check your inbox.` }
}
