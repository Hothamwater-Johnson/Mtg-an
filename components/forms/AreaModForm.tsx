'use client'

import { useActionState, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { PRICING_TABLES } from '@/lib/rule-engine/pricing-tables'
import type { ModificationKey } from '@/lib/rule-engine/types'

const MATERIAL_TIERS = [
  { value: 'economy', label: 'Economy', hint: 'Builder-grade materials' },
  { value: 'standard', label: 'Standard', hint: 'Mid-grade, most common' },
  { value: 'premium', label: 'Premium', hint: 'High-end finishes' },
] as const

const RISK_FLAGS = [
  { value: 'structural', label: 'Structural concern' },
  { value: 'asbestos_risk', label: 'Asbestos / hazmat risk' },
  { value: 'hvac_conflict', label: 'HVAC conflict' },
  { value: 'plumbing_conflict', label: 'Plumbing conflict' },
  { value: 'electrical_concern', label: 'Electrical concern' },
]

interface ExistingMod {
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

interface ModState {
  selected: boolean
  tier: 'economy' | 'standard' | 'premium'
  quantity: string
  unit: string
  measurementNotes: string
  permitRequired: boolean
  riskFlags: string[]
  notes: string
  overrideUnitCost: string
  overrideLaborCost: string
  expanded: boolean
}

type ActionFn = (prev: { error?: string } | null, formData: FormData) => Promise<{ error?: string } | null>

interface Props {
  modificationKeys: ModificationKey[]
  existingMods: ExistingMod[]
  action: ActionFn
  backHref: string
  submitLabel: string
}

function initModState(key: ModificationKey, existing: ExistingMod | undefined): ModState {
  const rule = PRICING_TABLES[key]
  return {
    selected: !!existing,
    tier: (existing?.material_tier as 'economy' | 'standard' | 'premium') ?? 'standard',
    quantity: existing?.quantity != null ? String(existing.quantity) : '',
    unit: existing?.unit ?? rule.defaultUnit,
    measurementNotes: existing?.measurement_notes ?? '',
    permitRequired: existing?.permit_required ?? false,
    riskFlags: existing?.risk_flags ?? [],
    notes: existing?.contractor_notes ?? '',
    overrideUnitCost: existing?.override_unit_cost != null ? String(existing.override_unit_cost) : '',
    overrideLaborCost: existing?.override_labor_cost != null ? String(existing.override_labor_cost) : '',
    expanded: !!existing,
  }
}

export function AreaModForm({ modificationKeys, existingMods, action, backHref, submitLabel }: Props) {
  const existingByKey = Object.fromEntries(existingMods.map((m) => [m.modification_key, m]))

  const [mods, setMods] = useState<Record<string, ModState>>(() =>
    Object.fromEntries(modificationKeys.map((key) => [key, initModState(key, existingByKey[key])]))
  )

  const [state, formAction, pending] = useActionState(action, null)

  function update(key: string, patch: Partial<ModState>) {
    setMods((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }))
  }

  function toggleSelected(key: string) {
    const next = !mods[key].selected
    update(key, { selected: next, expanded: next })
  }

  function toggleRiskFlag(key: string, flag: string) {
    const flags = mods[key].riskFlags
    const next = flags.includes(flag) ? flags.filter((f) => f !== flag) : [...flags, flag]
    update(key, { riskFlags: next })
  }

  function buildModificationsJson() {
    return JSON.stringify(
      Object.entries(mods)
        .filter(([, s]) => s.selected)
        .map(([key, s], i) => ({
          modification_key: key,
          material_tier: s.tier,
          quantity: s.quantity ? parseFloat(s.quantity) : null,
          unit: s.unit || null,
          measurement_notes: s.measurementNotes || null,
          permit_required: s.permitRequired,
          risk_flags: s.riskFlags,
          contractor_notes: s.notes || null,
          override_unit_cost: s.overrideUnitCost ? parseFloat(s.overrideUnitCost) : null,
          override_labor_cost: s.overrideLaborCost ? parseFloat(s.overrideLaborCost) : null,
          sort_order: i,
        }))
    )
  }

  const selectedCount = Object.values(mods).filter((s) => s.selected).length

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{state.error}</p>
      )}

      {/* Hidden JSON payload */}
      <input type="hidden" name="modifications_json" value={buildModificationsJson()} />

      <div className="space-y-3">
        {modificationKeys.map((key) => {
          const rule = PRICING_TABLES[key]
          const mod = mods[key]
          const needsQty = rule.requiredMeasurements.length > 0 || rule.defaultUnit !== 'each'

          return (
            <div
              key={key}
              className={cn(
                'bg-white rounded-xl border transition-colors',
                mod.selected ? 'border-blue-300' : 'border-gray-200'
              )}
            >
              {/* Header row */}
              <div className="flex items-start gap-3 p-4">
                <input
                  type="checkbox"
                  id={`check_${key}`}
                  checked={mod.selected}
                  onChange={() => toggleSelected(key)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor={`check_${key}`} className="flex-1 cursor-pointer min-w-0">
                  <p className="text-sm font-medium text-gray-900">{rule.description}</p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{rule.customerTemplate.replace('{qty}', '').replace('{unit}', '').trim()}</p>
                </label>
                {mod.selected && (
                  <button
                    type="button"
                    onClick={() => update(key, { expanded: !mod.expanded })}
                    className="text-gray-400 hover:text-gray-600 shrink-0 p-0.5"
                  >
                    {mod.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                )}
              </div>

              {/* Expanded fields */}
              {mod.selected && mod.expanded && (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
                  {/* Material tier */}
                  <div className="space-y-2">
                    <Label className="text-xs">Material tier</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {MATERIAL_TIERS.map((t) => (
                        <label
                          key={t.value}
                          className={cn(
                            'flex flex-col items-center rounded-lg border p-2.5 cursor-pointer text-center transition-colors',
                            mod.tier === t.value
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : 'border-gray-200 hover:border-gray-300 text-gray-600'
                          )}
                        >
                          <input
                            type="radio"
                            name={`tier_${key}`}
                            value={t.value}
                            checked={mod.tier === t.value}
                            onChange={() => update(key, { tier: t.value })}
                            className="sr-only"
                          />
                          <span className="text-xs font-semibold">{t.label}</span>
                          <span className="text-[10px] text-gray-400 mt-0.5">{t.hint}</span>
                          <span className="text-xs font-mono mt-1 text-gray-700">
                            ${rule.materialCostPerUnit[t.value]}/{rule.defaultUnit}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Quantity */}
                  {needsQty && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor={`qty_${key}`} className="text-xs">
                          Quantity ({rule.defaultUnit})
                          {rule.defaultUnit === 'sf' && <span className="text-gray-400"> — length × width</span>}
                        </Label>
                        <Input
                          id={`qty_${key}`}
                          type="number"
                          min={0}
                          step={0.01}
                          placeholder={rule.defaultUnit === 'each' ? '1' : '0.00'}
                          value={mod.quantity}
                          onChange={(e) => update(key, { quantity: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`notes_qty_${key}`} className="text-xs">Measurement notes</Label>
                        <Input
                          id={`notes_qty_${key}`}
                          placeholder="e.g. 5 ft × 3 ft"
                          value={mod.measurementNotes}
                          onChange={(e) => update(key, { measurementNotes: e.target.value })}
                        />
                      </div>
                    </div>
                  )}

                  {/* Permit + Risk flags */}
                  <div className="space-y-2">
                    <Label className="text-xs">Flags</Label>
                    <div className="flex flex-wrap gap-2">
                      <label className={cn(
                        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs cursor-pointer transition-colors',
                        mod.permitRequired ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      )}>
                        <input
                          type="checkbox"
                          checked={mod.permitRequired}
                          onChange={() => update(key, { permitRequired: !mod.permitRequired })}
                          className="sr-only"
                        />
                        🏛 Permit required
                      </label>
                      {RISK_FLAGS.map((f) => (
                        <label
                          key={f.value}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs cursor-pointer transition-colors',
                            mod.riskFlags.includes(f.value)
                              ? 'border-red-300 bg-red-50 text-red-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={mod.riskFlags.includes(f.value)}
                            onChange={() => toggleRiskFlag(key, f.value)}
                            className="sr-only"
                          />
                          ⚠️ {f.label}
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Contractor notes */}
                  <div className="space-y-1.5">
                    <Label htmlFor={`cnotes_${key}`} className="text-xs">Contractor notes</Label>
                    <Textarea
                      id={`cnotes_${key}`}
                      rows={2}
                      placeholder="Site-specific notes — substrate condition, blocking needed, access issues…"
                      value={mod.notes}
                      onChange={(e) => update(key, { notes: e.target.value })}
                    />
                  </div>

                  {/* Cost overrides (collapsed by default) */}
                  <details className="text-xs">
                    <summary className="cursor-pointer text-gray-400 hover:text-gray-600 select-none">Override pricing</summary>
                    <div className="grid grid-cols-2 gap-3 mt-2">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Unit material cost ($)</Label>
                        <Input
                          type="number" min={0} step={0.01} placeholder="Use table default"
                          value={mod.overrideUnitCost}
                          onChange={(e) => update(key, { overrideUnitCost: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs">Unit labor cost ($)</Label>
                        <Input
                          type="number" min={0} step={0.01} placeholder="Use table default"
                          value={mod.overrideLaborCost}
                          onChange={(e) => update(key, { overrideLaborCost: e.target.value })}
                        />
                      </div>
                    </div>
                  </details>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button type="button" variant="ghost" asChild>
          <Link href={backHref}>Back</Link>
        </Button>
        <div className="flex items-center gap-3">
          {selectedCount > 0 && (
            <span className="text-xs text-gray-500">{selectedCount} selected</span>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : submitLabel}
          </Button>
        </div>
      </div>
    </form>
  )
}
