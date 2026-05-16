import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { AreaModForm } from '@/components/forms/AreaModForm'
import { saveModificationsAction } from '../../actions'
import type { ModificationKey } from '@/lib/rule-engine/types'

const AREA_MODS: Record<string, ModificationKey[]> = {
  bathroom: ['grab_bar_tub', 'grab_bar_shower', 'grab_bar_toilet', 'shower_conversion', 'non_slip_floor', 'door_widening_bathroom', 'toilet_riser', 'lighting_upgrade'],
  entryway: ['exterior_ramp', 'handrail', 'threshold_reducer', 'door_widening_entry', 'landing_pad'],
}

const AREA_LABELS: Record<string, string> = { bathroom: 'Bathroom', entryway: 'Entryway' }

interface AreaRow {
  id: string
  job_id: string
  area_type: string
  area_label: string | null
  area_order: number
}

interface ModRow {
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
}

export default async function AreaModPage({ params }: { params: Promise<{ jobId: string; areaId: string }> }) {
  const { jobId, areaId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: area } = await (supabase as any)
    .from('job_areas')
    .select('id, job_id, area_type, area_label, area_order')
    .eq('id', areaId)
    .single() as { data: AreaRow | null }

  if (!area || area.job_id !== jobId) notFound()

  // Verify job belongs to this contractor
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job } = await (supabase as any)
    .from('jobs')
    .select('id, contractor_id')
    .eq('id', jobId)
    .eq('contractor_id', user!.id)
    .single()

  if (!job) notFound()

  // Existing modifications for this area
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingMods } = await (supabase as any)
    .from('job_area_modifications')
    .select('modification_key, material_tier, quantity, unit, measurement_notes, permit_required, risk_flags, contractor_notes, override_unit_cost, override_labor_cost')
    .eq('job_area_id', areaId) as { data: ModRow[] | null }

  // Find next area or fall through to scope
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: allAreas } = await (supabase as any)
    .from('job_areas')
    .select('id, area_order')
    .eq('job_id', jobId)
    .order('area_order', { ascending: true }) as { data: { id: string; area_order: number }[] | null }

  const currentIndex = (allAreas ?? []).findIndex((a) => a.id === areaId)
  const nextArea = (allAreas ?? [])[currentIndex + 1]
  const nextUrl = nextArea ? `/jobs/${jobId}/${nextArea.id}` : `/jobs/${jobId}/scope`
  const isLastArea = !nextArea

  const modKeys = AREA_MODS[area.area_type] ?? []
  const areaTitle = area.area_label || AREA_LABELS[area.area_type] || area.area_type

  const boundAction = saveModificationsAction.bind(null, areaId, jobId, nextUrl)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href={`/jobs/${jobId}/areas`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-4 w-4" />
          Areas
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-1">{areaTitle}</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Select all modifications in scope and fill in the details.
        </p>
      </div>

      <AreaModForm
        modificationKeys={modKeys}
        existingMods={existingMods ?? []}
        action={boundAction}
        backHref={`/jobs/${jobId}/areas`}
        submitLabel={isLastArea ? 'Save & continue to scope →' : 'Save & next area →'}
      />
    </div>
  )
}
