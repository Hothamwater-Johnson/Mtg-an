'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function saveQuoteAction(
  jobId: string,
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const notes = (formData.get('notes') as string | null) || null

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('jobs')
    .update({ notes })
    .eq('id', jobId)
    .eq('contractor_id', user.id)

  if (error) return { error: 'Failed to save notes. Please try again.' }

  const action = formData.get('_action') as string | null
  if (action === 'continue') redirect(`/jobs/${jobId}/preview`)

  return null
}
