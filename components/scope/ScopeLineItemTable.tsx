'use client'

import { useActionState, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn, formatCurrency } from '@/lib/utils'
import { computeJobTotals } from '@/lib/rule-engine'
import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react'

const CATEGORY_STYLES: Record<string, string> = {
  material: 'bg-blue-50 text-blue-700',
  labor:    'bg-purple-50 text-purple-700',
  permit:   'bg-amber-50 text-amber-700',
  demo:     'bg-orange-50 text-orange-700',
  misc:     'bg-gray-100 text-gray-600',
}

export interface ScopeItem {
  id: string
  job_area_id: string | null
  category: string
  description: string
  scope_description: string | null
  customer_description: string | null
  quantity: number
  unit: string | null
  unit_material_cost: number
  unit_labor_cost: number
  markup_pct: number
  total_line: number | null
  is_included: boolean
  sort_order: number
}

export interface AreaGroup {
  id: string
  label: string
}

type SaveAction = (prev: { error?: string } | null, formData: FormData) => Promise<{ error?: string } | null>

interface Props {
  items: ScopeItem[]
  areas: AreaGroup[]
  saveAction: SaveAction
  jobId: string
}

interface EditableItem extends ScopeItem {
  expanded: boolean
}

function lineTotal(item: EditableItem): number {
  const sub = item.quantity * (item.unit_material_cost + item.unit_labor_cost)
  return Math.round(sub * (1 + item.markup_pct / 100) * 100) / 100
}

export function ScopeLineItemTable({ items, areas, saveAction, jobId: _jobId }: Props) {
  const [rows, setRows] = useState<EditableItem[]>(() =>
    items.map((item) => ({ ...item, expanded: false }))
  )
  const [state, formAction, pending] = useActionState(saveAction, null)

  function updateRow(id: string, patch: Partial<EditableItem>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  const areaMap = Object.fromEntries(areas.map((a) => [a.id, a.label]))

  const grouped = rows.reduce<Record<string, EditableItem[]>>((acc, row) => {
    const key = row.job_area_id ?? '__no_area__'
    if (!acc[key]) acc[key] = []
    acc[key].push(row)
    return acc
  }, {})

  const totals = computeJobTotals(
    rows.map((r) => ({
      quantity: r.quantity,
      unitMaterialCost: r.unit_material_cost,
      unitLaborCost: r.unit_labor_cost,
      markupPct: r.markup_pct,
      isIncluded: r.is_included,
    }))
  )

  return (
    <form action={formAction} className="space-y-6">
      <input
        type="hidden"
        name="items_json"
        value={JSON.stringify(
          rows.map((r) => ({
            id: r.id,
            description: r.description,
            scope_description: r.scope_description ?? '',
            customer_description: r.customer_description ?? '',
            quantity: r.quantity,
            unit: r.unit ?? 'each',
            unit_material_cost: r.unit_material_cost,
            unit_labor_cost: r.unit_labor_cost,
            markup_pct: r.markup_pct,
            is_included: r.is_included,
          }))
        )}
      />

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{state.error}</p>
      )}

      {Object.entries(grouped).map(([areaId, areaRows]) => (
        <section key={areaId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              {areaMap[areaId] ?? 'General'}
            </p>
          </div>

          <div className="divide-y divide-gray-100">
            {areaRows.map((row) => (
              <div key={row.id} className={cn('transition-colors', !row.is_included && 'opacity-50 bg-gray-50')}>

                {/* ── Main row ────────────────────────────────────── */}
                <div className="flex items-center gap-2 px-3 py-3">

                  {/* Include toggle — 44px tap target */}
                  <button
                    type="button"
                    onClick={() => updateRow(row.id, { is_included: !row.is_included })}
                    className="shrink-0 p-2 -ml-1 rounded-md text-gray-400 hover:text-gray-600"
                    title={row.is_included ? 'Exclude' : 'Include'}
                  >
                    {row.is_included
                      ? <Eye className="h-5 w-5 text-blue-500" />
                      : <EyeOff className="h-5 w-5" />}
                  </button>

                  {/* Category badge — desktop only (shown in expanded panel on mobile) */}
                  <span className={cn(
                    'hidden md:inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide',
                    CATEGORY_STYLES[row.category] ?? CATEGORY_STYLES.misc
                  )}>
                    {row.category}
                  </span>

                  {/* Description */}
                  <input
                    type="text"
                    value={row.description}
                    onChange={(e) => updateRow(row.id, { description: e.target.value })}
                    className="flex-1 min-w-0 text-sm text-gray-900 bg-transparent border-0 focus:outline-none focus:ring-0"
                    aria-label="Line item description"
                  />

                  {/* Qty + unit — desktop only */}
                  <div className="hidden md:flex items-center gap-1 shrink-0">
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={row.quantity}
                      onChange={(e) => updateRow(row.id, { quantity: parseFloat(e.target.value) || 0 })}
                      className="w-14 text-xs text-right bg-transparent border-0 focus:outline-none focus:ring-0 text-gray-600"
                      aria-label="Quantity"
                    />
                    <span className="text-xs text-gray-400">{row.unit ?? 'each'}</span>
                  </div>

                  {/* Line total */}
                  <span className="text-sm font-semibold text-gray-900 shrink-0 w-20 text-right tabular-nums">
                    {formatCurrency(lineTotal(row))}
                  </span>

                  {/* Expand — 44px tap target */}
                  <button
                    type="button"
                    onClick={() => updateRow(row.id, { expanded: !row.expanded })}
                    className="shrink-0 p-2 -mr-1 text-gray-400 hover:text-gray-600"
                    aria-label={row.expanded ? 'Collapse' : 'Expand'}
                  >
                    {row.expanded
                      ? <ChevronUp className="h-5 w-5" />
                      : <ChevronDown className="h-5 w-5" />}
                  </button>
                </div>

                {/* ── Expanded panel ──────────────────────────────── */}
                {row.expanded && (
                  <div className="px-4 md:px-12 pb-4 pt-3 space-y-4 bg-gray-50 border-t border-gray-100">

                    {/* Category + qty on mobile (hidden on desktop — shown in main row) */}
                    <div className="flex items-center gap-3 md:hidden">
                      <span className={cn(
                        'inline-flex items-center rounded-full px-2 py-1 text-xs font-medium uppercase tracking-wide',
                        CATEGORY_STYLES[row.category] ?? CATEGORY_STYLES.misc
                      )}>
                        {row.category}
                      </span>
                      <label className="flex items-center gap-2 text-xs text-gray-600 ml-auto">
                        <span>Qty</span>
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          value={row.quantity}
                          onChange={(e) => updateRow(row.id, { quantity: parseFloat(e.target.value) || 0 })}
                          className="w-16 rounded border border-gray-300 px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        <span className="text-gray-400">{row.unit ?? 'each'}</span>
                      </label>
                    </div>

                    {/* Cost fields — stacked on mobile, 3-col on md+ */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <label className="space-y-1.5">
                        <span className="text-gray-500 font-medium">Unit material ($)</span>
                        <input
                          type="number" min={0} step={0.01}
                          value={row.unit_material_cost}
                          onChange={(e) => updateRow(row.id, { unit_material_cost: parseFloat(e.target.value) || 0 })}
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-gray-500 font-medium">Unit labor ($)</span>
                        <input
                          type="number" min={0} step={0.01}
                          value={row.unit_labor_cost}
                          onChange={(e) => updateRow(row.id, { unit_labor_cost: parseFloat(e.target.value) || 0 })}
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </label>
                      <label className="space-y-1.5">
                        <span className="text-gray-500 font-medium">Markup (%)</span>
                        <input
                          type="number" min={0} max={100} step={0.1}
                          value={row.markup_pct}
                          onChange={(e) => updateRow(row.id, { markup_pct: parseFloat(e.target.value) || 0 })}
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </label>
                    </div>

                    {/* Scope description */}
                    {row.scope_description && (
                      <div className="space-y-1.5">
                        <p className="text-xs text-gray-500 font-medium">Scope of work (contractor)</p>
                        <textarea
                          rows={2}
                          value={row.scope_description ?? ''}
                          onChange={(e) => updateRow(row.id, { scope_description: e.target.value })}
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                        />
                      </div>
                    )}

                    {/* Customer description */}
                    {row.customer_description && (
                      <div className="space-y-1.5">
                        <p className="text-xs text-gray-500 font-medium">Customer explanation</p>
                        <textarea
                          rows={2}
                          value={row.customer_description ?? ''}
                          onChange={(e) => updateRow(row.id, { customer_description: e.target.value })}
                          className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}

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
          <div className="flex justify-between font-semibold text-gray-900 border-t border-gray-200 pt-2">
            <span>Total estimate</span>
            <span className="tabular-nums">{formatCurrency(totals.grandTotal)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3">
        <Button type="submit" variant="outline" disabled={pending} className="w-full sm:w-auto">
          {pending ? 'Saving…' : 'Save changes'}
        </Button>
        <Button type="submit" name="_action" value="continue" disabled={pending} className="w-full sm:w-auto">
          Continue to quote →
        </Button>
      </div>
    </form>
  )
}
