import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { ScopeItem, AreaGroup } from '@/components/scope/ScopeLineItemTable'
import { ScopePageClient } from './ScopePageClient'

const AREA_LABELS: Record<string, string> = { bathroom: 'Bathroom', entryway: 'Entryway' }

export default async function ScopePage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job } = await (supabase as any)
    .from('jobs')
    .select('id')
    .eq('id', jobId)
    .eq('contractor_id', user.id)
    .single()

  if (!job) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: areas } = await (supabase as any)
    .from('job_areas')
    .select('id, area_type, area_label, area_order')
    .eq('job_id', jobId)
    .order('area_order', { ascending: true }) as {
      data: { id: string; area_type: string; area_label: string | null; area_order: number }[] | null
    }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: items } = await (supabase as any)
    .from('scope_line_items')
    .select('id, job_area_id, category, description, scope_description, customer_description, quantity, unit, unit_material_cost, unit_labor_cost, markup_pct, total_line, is_included, sort_order')
    .eq('job_id', jobId)
    .order('sort_order', { ascending: true }) as { data: ScopeItem[] | null }

  const areaGroups: AreaGroup[] = (areas ?? []).map((a) => ({
    id: a.id,
    label: a.area_label || AREA_LABELS[a.area_type] || a.area_type,
  }))

  return <ScopePageClient jobId={jobId} items={items ?? []} areas={areaGroups} />
}
