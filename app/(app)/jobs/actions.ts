'use server'

// Supabase calls use `as any` at the boundary — replace with CLI-generated types once linked.

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

type ActionState = { error?: string } | null

// ─── Job ──────────────────────────────────────────────────────────────────────

export async function createJobAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const clientId = formData.get('client_id') as string
  if (!clientId) return { error: 'Please select a client.' }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job, error } = await (supabase as any)
    .from('jobs')
    .insert({
      contractor_id: user.id,
      client_id: clientId,
      title: (formData.get('title') as string) || null,
      site_address_override: (formData.get('site_address_override') as string) || null,
      permit_jurisdiction: (formData.get('permit_jurisdiction') as string) || null,
      notes: (formData.get('notes') as string) || null,
    })
    .select('id')
    .single()

  if (error || !job) return { error: error?.message ?? 'Failed to create job.' }

  revalidatePath('/dashboard')
  redirect(`/jobs/${job.id}/areas`)
}

// ─── Areas ────────────────────────────────────────────────────────────────────

export async function saveAreasAction(jobId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const areaTypes = formData.getAll('area_types') as string[]
  if (!areaTypes.length) return { error: 'Select at least one area.' }

  // Fetch existing areas to avoid duplicating
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (supabase as any)
    .from('job_areas')
    .select('id, area_type')
    .eq('job_id', jobId) as { data: { id: string; area_type: string }[] | null }

  const existingTypes = new Set((existing ?? []).map((a) => a.area_type))

  // Insert only new area types
  const toInsert = areaTypes
    .filter((t) => !existingTypes.has(t))
    .map((area_type, i) => ({
      job_id: jobId,
      area_type,
      area_label: (formData.get(`label_${area_type}`) as string) || null,
      area_order: (existing?.length ?? 0) + i,
    }))

  if (toInsert.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('job_areas').insert(toInsert)
    if (error) return { error: error.message }
  }

  // Update labels on existing areas
  for (const area of existing ?? []) {
    const label = formData.get(`label_${area.area_type}`) as string
    if (label !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from('job_areas')
        .update({ area_label: label || null })
        .eq('id', area.id)
    }
  }

  // Fetch first area to redirect to
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: areas } = await (supabase as any)
    .from('job_areas')
    .select('id')
    .eq('job_id', jobId)
    .order('area_order', { ascending: true }) as { data: { id: string }[] | null }

  revalidatePath(`/jobs/${jobId}`)
  if (areas?.[0]) {
    redirect(`/jobs/${jobId}/${areas[0].id}`)
  }
  redirect(`/jobs/${jobId}`)
}

// ─── Modifications ────────────────────────────────────────────────────────────

interface ModificationPayload {
  modification_key: string
  material_tier: string
  quantity: number | null
  unit: string | null
  measurement_notes: string | null
  permit_required: boolean
  risk_flags: string[]
  contractor_notes: string | null
  override_unit_cost: number | null
  override_labor_cost: number | null
  sort_order: number
}

export async function saveModificationsAction(
  areaId: string,
  jobId: string,
  nextUrl: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const modificationsJson = formData.get('modifications_json') as string
  let modifications: ModificationPayload[]
  try {
    modifications = JSON.parse(modificationsJson)
  } catch {
    return { error: 'Invalid form data.' }
  }

  // Delete and re-insert modifications for this area
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('job_area_modifications').delete().eq('job_area_id', areaId)

  if (modifications.length > 0) {
    const rows = modifications.map((m) => ({ ...m, job_area_id: areaId }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('job_area_modifications').insert(rows)
    if (error) return { error: error.message }
  }

  revalidatePath(`/jobs/${jobId}`)
  redirect(nextUrl)
}
