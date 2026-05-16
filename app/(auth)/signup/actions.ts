'use server'

import { createClient } from '@/lib/supabase/server'

type ActionState = { error?: string; success?: string } | null

export async function signupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const companyName = formData.get('company_name') as string
  const displayName = formData.get('display_name') as string

  const supabase = await createClient()

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      // Passed to raw_user_meta_data — picked up by handle_new_user() trigger
      data: { company_name: companyName, display_name: displayName },
    },
  })

  if (error) return { error: error.message }

  return {
    success: `We sent a confirmation link to ${email}. Click it to activate your account.`,
  }
}
