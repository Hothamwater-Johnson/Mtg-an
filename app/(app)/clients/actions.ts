'use server'

// Supabase query results use `as any` at the boundary — replace with
// generated types (npx supabase gen types typescript --local) once linked.

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { clientSchema } from '@/lib/validations/client'

type ActionState = { error?: string; fieldErrors?: Record<string, string[]> } | null

function parseClientForm(formData: FormData) {
  return {
    first_name: formData.get('first_name') as string,
    last_name: formData.get('last_name') as string,
    address_line1: formData.get('address_line1') as string,
    address_line2: (formData.get('address_line2') as string) || undefined,
    city: formData.get('city') as string,
    state: (formData.get('state') as string).toUpperCase(),
    zip: formData.get('zip') as string,
    phone: (formData.get('phone') as string) || undefined,
    email: (formData.get('email') as string) || undefined,
    referral_source: (formData.get('referral_source') as string) || undefined,
    referral_notes: (formData.get('referral_notes') as string) || undefined,
  }
}

export async function createClientAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const parsed = clientSchema.safeParse(parseClientForm(formData))
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: newClient, error } = await (supabase as any)
    .from('clients')
    .insert({ ...parsed.data, contractor_id: user.id })
    .select('id')
    .single()

  if (error || !newClient) return { error: error?.message ?? 'Failed to create client.' }

  revalidatePath('/clients')
  redirect(`/clients/${newClient.id}`)
}

export async function updateClientAction(clientId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const parsed = clientSchema.safeParse(parseClientForm(formData))
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]> }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('clients')
    .update(parsed.data)
    .eq('id', clientId)
    .eq('contractor_id', user.id)

  if (error) return { error: error.message }

  revalidatePath(`/clients/${clientId}`)
  revalidatePath('/clients')
  return null
}
