import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildScopeLineItems, computeLineTotal } from '@/lib/rule-engine'
import type { ModificationInput } from '@/lib/rule-engine/types'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job } = await (supabase as any)
    .from('jobs')
    .select('id, contractor_id')
    .eq('id', jobId)
    .eq('contractor_id', user.id)
    .single()

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('contractor_profiles')
    .select('default_labor_rate, default_markup_pct')
    .eq('id', user.id)
    .single()

  const laborRate: number = profile?.default_labor_rate ?? 75
  const markupPct: number = profile?.default_markup_pct ?? 20

  // Fetch all selected modifications, grouped with their area
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: areas } = await (supabase as any)
    .from('job_areas')
    .select(`
      id,
      area_type,
      area_label,
      area_order,
      job_area_modifications (
        id,
        modification_key,
        material_tier,
        quantity,
        unit,
        measurement_notes,
        permit_required,
        risk_flags,
        contractor_notes,
        override_unit_cost,
        override_labor_cost,
        sort_order
      )
    `)
    .eq('job_id', jobId)
    .order('area_order', { ascending: true }) as {
    data: Array<{
      id: string
      area_type: string
      area_label: string | null
      area_order: number
      job_area_modifications: Array<{
        id: string
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
      }>
    }> | null
  }

  if (!areas?.length) {
    return NextResponse.json({ error: 'No areas found. Add areas before generating scope.' }, { status: 400 })
  }

  // Build all scope line items across all areas
  const insertRows: Array<Record<string, unknown>> = []
  let globalSortOrder = 0

  for (const area of areas) {
    const mods = [...(area.job_area_modifications ?? [])].sort((a, b) => a.sort_order - b.sort_order)
    if (!mods.length) continue

    const inputs: ModificationInput[] = mods.map((m) => ({
      key: m.modification_key as ModificationInput['key'],
      materialTier: m.material_tier as ModificationInput['materialTier'],
      quantity: m.quantity ?? 1,
      unit: m.unit ?? 'each',
      permitRequired: m.permit_required,
      riskFlags: m.risk_flags ?? [],
      contractorNotes: m.contractor_notes ?? '',
      overrideUnitCost: m.override_unit_cost ?? undefined,
      overrideLaborCost: m.override_labor_cost ?? undefined,
    }))

    const lineItems = buildScopeLineItems(inputs, laborRate, markupPct)

    for (const item of lineItems) {
      const totalLine = computeLineTotal(item.quantity, item.unitMaterialCost, item.unitLaborCost, item.markupPct)
      insertRows.push({
        job_id: jobId,
        job_area_id: area.id,
        category: item.category,
        description: item.description,
        scope_description: item.scopeDescription,
        customer_description: item.customerDescription,
        quantity: item.quantity,
        unit: item.unit,
        unit_material_cost: item.unitMaterialCost,
        unit_labor_cost: item.unitLaborCost,
        markup_pct: item.markupPct,
        total_line: totalLine,
        is_included: true,
        sort_order: globalSortOrder++,
        line_number: globalSortOrder,
      })
    }
  }

  // Delete existing line items, then insert fresh
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('scope_line_items').delete().eq('job_id', jobId)

  if (insertRows.length > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any).from('scope_line_items').insert(insertRows)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ count: insertRows.length })
}
