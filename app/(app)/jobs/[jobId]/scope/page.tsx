'use client'

import { use, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScopeLineItemTable } from '@/components/scope/ScopeLineItemTable'
import type { ScopeItem, AreaGroup } from '@/components/scope/ScopeLineItemTable'
import { saveScopeTableAction } from './actions'

// Data is fetched by the wrapper server component below and passed as props.
// This Client Component owns the "generate" trigger and the editable table.

interface Props {
  jobId: string
  items: ScopeItem[]
  areas: AreaGroup[]
}

function ScopePageClient({ jobId, items, areas }: Props) {
  const router = useRouter()
  const [generating, startGenerate] = useTransition()
  const [generateError, setGenerateError] = useState<string | null>(null)

  async function handleGenerate() {
    setGenerateError(null)
    startGenerate(async () => {
      const res = await fetch(`/api/jobs/${jobId}/scope`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setGenerateError(json.error ?? 'Failed to generate scope.')
      } else {
        router.refresh()
      }
    })
  }

  const boundSave = saveScopeTableAction.bind(null, jobId)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href={`/jobs/${jobId}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ChevronLeft className="h-4 w-4" />
            Job overview
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 mt-1">Scope of work</h1>
          {items.length > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">{items.length} line items — edit descriptions, quantities, or costs, then save.</p>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={generating}
        >
          <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
          {items.length > 0 ? 'Regenerate' : 'Generate scope'}
        </Button>
      </div>

      {generateError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{generateError}</p>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-sm font-medium text-gray-900">No scope generated yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Click &ldquo;Generate scope&rdquo; to build line items from your area modifications.
          </p>
          <Button className="mt-4" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating…' : 'Generate scope'}
          </Button>
        </div>
      ) : (
        <ScopeLineItemTable
          items={items}
          areas={areas}
          saveAction={boundSave}
          jobId={jobId}
        />
      )}
    </div>
  )
}

// ─── Server wrapper ────────────────────────────────────────────────────────────
// Next.js 16 requires a default export that can be a Server Component.
// We fetch data here, then pass to the Client Component above.

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default function ScopePage({ params }: { params: Promise<{ jobId: string }> }) {
  return <ScopePageLoader params={params} />
}

function ScopePageLoader({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params)
  return <ScopeDataLoader jobId={jobId} />
}

// Separate async component so we can await Supabase calls
// without making the whole page a Server Component (we need client interactivity).
// Pattern: async Server Component wraps the Client Component.
import { Suspense } from 'react'

function ScopeDataLoader({ jobId }: { jobId: string }) {
  return (
    <Suspense fallback={<div className="text-sm text-gray-400 p-8">Loading…</div>}>
      <ScopeDataFetcher jobId={jobId} />
    </Suspense>
  )
}

async function ScopeDataFetcher({ jobId }: { jobId: string }) {
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

  const AREA_LABELS: Record<string, string> = { bathroom: 'Bathroom', entryway: 'Entryway' }

  const areaGroups: AreaGroup[] = (areas ?? []).map((a) => ({
    id: a.id,
    label: a.area_label || AREA_LABELS[a.area_type] || a.area_type,
  }))

  return <ScopePageClient jobId={jobId} items={items ?? []} areas={areaGroups} />
}
