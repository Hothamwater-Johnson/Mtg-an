'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { computeLineTotal } from '@/lib/rule-engine'

type ActionState = { error?: string } | null

function pathFor(jobId: string) {
  return `/jobs/${jobId}/scope`
}

export async function updateLineItemAction(
  jobId: string,
  itemId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const quantity = parseFloat(formData.get('quantity') as string)
  const unitMaterialCost = parseFloat(formData.get('unit_material_cost') as string)
  const unitLaborCost = parseFloat(formData.get('unit_labor_cost') as string)
  const markupPct = parseFloat(formData.get('markup_pct') as string)
  const description = formData.get('description') as string
  const scopeDescription = formData.get('scope_description') as string
  const customerDescription = formData.get('customer_description') as string
  const isIncluded = formData.get('is_included') === 'true'

  const totalLine = computeLineTotal(quantity, unitMaterialCost, unitLaborCost, markupPct)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('scope_line_items')
    .update({
      description,
      scope_description: scopeDescription || null,
      customer_description: customerDescription || null,
      quantity,
      unit_material_cost: unitMaterialCost,
      unit_labor_cost: unitLaborCost,
      markup_pct: markupPct,
      total_line: totalLine,
      is_included: isIncluded,
    })
    .eq('id', itemId)
    .eq('job_id', jobId)

  if (error) return { error: error.message }

  revalidatePath(pathFor(jobId))
  return null
}

export async function toggleLineItemAction(jobId: string, itemId: string, isIncluded: boolean): Promise<void> {
  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('scope_line_items')
    .update({ is_included: isIncluded })
    .eq('id', itemId)
    .eq('job_id', jobId)

  revalidatePath(pathFor(jobId))
}

export async function saveScopeTableAction(
  jobId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated.' }

  const itemsJson = formData.get('items_json') as string
  let items: Array<{
    id: string
    description: string
    scope_description: string
    customer_description: string
    quantity: number
    unit: string
    unit_material_cost: number
    unit_labor_cost: number
    markup_pct: number
    is_included: boolean
  }>

  try {
    items = JSON.parse(itemsJson)
  } catch {
    return { error: 'Invalid form data.' }
  }

  for (const item of items) {
    const totalLine = computeLineTotal(item.quantity, item.unit_material_cost, item.unit_labor_cost, item.markup_pct)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('scope_line_items')
      .update({
        description: item.description,
        scope_description: item.scope_description || null,
        customer_description: item.customer_description || null,
        quantity: item.quantity,
        unit: item.unit,
        unit_material_cost: item.unit_material_cost,
        unit_labor_cost: item.unit_labor_cost,
        markup_pct: item.markup_pct,
        total_line: totalLine,
        is_included: item.is_included,
      })
      .eq('id', item.id)
      .eq('job_id', jobId)
  }

  revalidatePath(pathFor(jobId))
  return null
}
