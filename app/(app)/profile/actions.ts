'use server'

// Supabase query results use `as any` at the boundary — replace with
// generated types (npx supabase gen types typescript --local) once linked.

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

type ActionState = { error?: string; success?: string } | null

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  // Handle logo upload
  const logoFile = formData.get('logo') as File | null
  let logoUrl: string | undefined

  if (logoFile && logoFile.size > 0) {
    const ext = logoFile.name.split('.').pop() ?? 'png'
    const path = `${user.id}/logo.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(path, logoFile, { upsert: true, contentType: logoFile.type })

    if (uploadError) return { error: `Logo upload failed: ${uploadError.message}` }

    const { data: { publicUrl } } = supabase.storage.from('logos').getPublicUrl(path)
    logoUrl = publicUrl
  }

  const update: Record<string, unknown> = {
    company_name: formData.get('company_name'),
    display_name: formData.get('display_name'),
    license_number: formData.get('license_number') || null,
    phone: formData.get('phone') || null,
    email: formData.get('email'),
    address_line1: formData.get('address_line1') || null,
    city: formData.get('city') || null,
    state: formData.get('state') || null,
    zip: formData.get('zip') || null,
    default_labor_rate: Number(formData.get('default_labor_rate')) || 75,
    default_markup_pct: Number(formData.get('default_markup_pct')) || 20,
  }

  if (logoUrl) update.logo_url = logoUrl

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('contractor_profiles')
    .update(update)
    .eq('id', user.id)

  if (error) return { error: error.message }

  revalidatePath('/profile')
  revalidatePath('/', 'layout')
  return { success: 'Profile saved.' }
}
