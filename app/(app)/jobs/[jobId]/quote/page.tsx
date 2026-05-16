import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { computeJobTotals } from '@/lib/rule-engine'
import { formatCurrency } from '@/lib/utils'
import { saveQuoteAction } from './actions'
import { QuoteNotes } from './QuoteNotes'

interface ScopeRow {
  id: string
  job_area_id: string | null
  category: string
  description: string
  quantity: number
  unit: string | null
  unit_material_cost: number
  unit_labor_cost: number
  markup_pct: number
  is_included: boolean
}

interface AreaRow {
  id: string
  area_type: string
  area_label: string | null
  area_order: number
}

const AREA_LABELS: Record<string, string> = { bathroom: 'Bathroom', entryway: 'Entryway' }

const CATEGORY_STYLES: Record<string, string> = {
  material: 'bg-blue-50 text-blue-700',
  labor:    'bg-purple-50 text-purple-700',
  permit:   'bg-amber-50 text-amber-700',
  demo:     'bg-orange-50 text-orange-700',
  misc:     'bg-gray-100 text-gray-600',
}

function lineTotal(item: ScopeRow): number {
  const sub = item.quantity * (item.unit_material_cost + item.unit_labor_cost)
  return Math.round(sub * (1 + item.markup_pct / 100) * 100) / 100
}

export default async function QuotePage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job } = await (supabase as any)
    .from('jobs')
    .select('id, title, notes, clients ( first_name, last_name )')
    .eq('id', jobId)
    .eq('contractor_id', user.id)
    .single() as {
      data: {
        id: string
        title: string | null
        notes: string | null
        clients: { first_name: string; last_name: string } | null
      } | null
    }

  if (!job) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: areas } = await (supabase as any)
    .from('job_areas')
    .select('id, area_type, area_label, area_order')
    .eq('job_id', jobId)
    .order('area_order', { ascending: true }) as { data: AreaRow[] | null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: items } = await (supabase as any)
    .from('scope_line_items')
    .select('id, job_area_id, category, description, quantity, unit, unit_material_cost, unit_labor_cost, markup_pct, is_included')
    .eq('job_id', jobId)
    .order('sort_order', { ascending: true }) as { data: ScopeRow[] | null }

  const includedItems = (items ?? []).filter((i) => i.is_included)

  if (includedItems.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link href={`/jobs/${jobId}/scope`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ChevronLeft className="h-4 w-4" />
            Scope of work
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 mt-1">Quote review</h1>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-sm font-medium text-gray-900">No included line items</p>
          <p className="text-sm text-gray-500 mt-1">Go back to scope and include at least one item.</p>
          <Link href={`/jobs/${jobId}/scope`} className="inline-flex mt-4 text-sm font-medium text-blue-600 hover:underline">
            ← Back to scope
          </Link>
        </div>
      </div>
    )
  }

  const areaMap = Object.fromEntries((areas ?? []).map((a) => [
    a.id,
    a.area_label || AREA_LABELS[a.area_type] || a.area_type,
  ]))

  const grouped = includedItems.reduce<Record<string, ScopeRow[]>>((acc, row) => {
    const key = row.job_area_id ?? '__no_area__'
    if (!acc[key]) acc[key] = []
    acc[key].push(row)
    return acc
  }, {})

  const totals = computeJobTotals(
    includedItems.map((r) => ({
      quantity: r.quantity,
      unitMaterialCost: r.unit_material_cost,
      unitLaborCost: r.unit_labor_cost,
      markupPct: r.markup_pct,
      isIncluded: true,
    }))
  )

  const clientName = job.clients
    ? `${job.clients.first_name} ${job.clients.last_name}`
    : null

  const boundAction = saveQuoteAction.bind(null, jobId)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href={`/jobs/${jobId}/scope`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-4 w-4" />
          Scope of work
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-1">Quote review</h1>
        {clientName && (
          <p className="text-sm text-gray-500 mt-0.5">
            {job.title || clientName} · {includedItems.length} included items
          </p>
        )}
      </div>

      {/* Line items by area — read-only */}
      {Object.entries(grouped).map(([areaId, areaRows]) => {
        const areaTotal = areaRows.reduce((sum, r) => sum + lineTotal(r), 0)
        return (
          <section key={areaId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {areaMap[areaId] ?? 'General'}
              </p>
              <p className="text-xs font-semibold text-gray-700 tabular-nums">
                {formatCurrency(areaTotal)}
              </p>
            </div>

            <div className="divide-y divide-gray-100">
              {areaRows.map((row) => (
                <div key={row.id} className="flex items-start gap-3 px-4 py-3">
                  <span className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide mt-0.5 ${CATEGORY_STYLES[row.category] ?? CATEGORY_STYLES.misc}`}>
                    {row.category}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">{row.description}</p>
                    {(row.quantity !== 1 || row.unit !== 'each') && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {row.quantity} {row.unit ?? 'each'}
                      </p>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 tabular-nums shrink-0">
                    {formatCurrency(lineTotal(row))}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )
      })}

      {/* Totals */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="space-y-2 text-sm max-w-xs ml-auto">
          <div className="flex justify-between text-gray-600">
            <span>Materials</span>
            <span className="tabular-nums">{formatCurrency(totals.totalMaterial)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Labor</span>
            <span className="tabular-nums">{formatCurrency(totals.totalLabor)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>Markup</span>
            <span className="tabular-nums">{formatCurrency(totals.totalMarkup)}</span>
          </div>
          <div className="flex justify-between font-bold text-gray-900 border-t border-gray-200 pt-2 text-base">
            <span>Total estimate</span>
            <span className="tabular-nums">{formatCurrency(totals.grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Notes + actions */}
      <QuoteNotes
        jobId={jobId}
        initialNotes={job.notes ?? ''}
        action={boundAction}
      />
    </div>
  )
}
