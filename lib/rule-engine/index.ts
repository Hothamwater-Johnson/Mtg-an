import { PRICING_TABLES } from './pricing-tables'
import type {
  ModificationInput,
  ScopeLineItem,
  ValidationError,
} from './types'

function interpolate(template: string, qty: number, unit: string): string {
  return template
    .replace(/\{qty\}/g, String(qty))
    .replace(/\{unit\}/g, unit)
}

export function validateModifications(
  modifications: ModificationInput[]
): ValidationError[] {
  const errors: ValidationError[] = []
  for (const mod of modifications) {
    const rule = PRICING_TABLES[mod.key]
    if (!rule) {
      errors.push({ modificationKey: mod.key, message: `Unknown modification key: ${mod.key}` })
      continue
    }
    for (const measurement of rule.requiredMeasurements) {
      if (!mod.quantity || mod.quantity <= 0) {
        errors.push({
          modificationKey: mod.key,
          message: `${rule.description} requires a quantity for ${measurement}.`,
        })
      }
    }
  }
  return errors
}

export function buildScopeLineItems(
  modifications: ModificationInput[],
  laborRatePerHour: number,
  defaultMarkupPct: number
): ScopeLineItem[] {
  const items: ScopeLineItem[] = []
  let sortOrder = 0

  for (const mod of modifications) {
    const rule = PRICING_TABLES[mod.key]
    if (!rule) continue

    const tier = mod.materialTier
    const qty = mod.quantity || 1
    const unit = mod.unit || rule.defaultUnit

    const unitMaterialCost = mod.overrideUnitCost ?? rule.materialCostPerUnit[tier]
    const unitLaborCost = mod.overrideLaborCost ?? (rule.laborHoursPerUnit[tier] * laborRatePerHour)

    // Demo line (if applicable) — labor only, before main line
    if (rule.generatesDemoLine && rule.demoLaborHours) {
      items.push({
        category: 'demo',
        description: `Demo / removal — ${rule.description}`,
        scopeDescription: `Remove and dispose of existing ${rule.description.toLowerCase()}. Protect adjacent surfaces.`,
        customerDescription: `We will remove the existing ${rule.description.toLowerCase().replace('(curbless)', '').trim()} before installation.`,
        quantity: 1,
        unit: 'ls',
        unitMaterialCost: 0,
        unitLaborCost: rule.demoLaborHours * laborRatePerHour,
        markupPct: defaultMarkupPct,
        sortOrder: sortOrder++,
      })
    }

    // Main scope line
    items.push({
      category: 'material',
      description: rule.description,
      scopeDescription: interpolate(rule.scopeTemplate, qty, unit),
      customerDescription: interpolate(rule.customerTemplate, qty, unit),
      quantity: qty,
      unit,
      unitMaterialCost,
      unitLaborCost,
      markupPct: defaultMarkupPct,
      sortOrder: sortOrder++,
    })

    // Permit line (zero cost — contractor fills in actual fee)
    if (mod.permitRequired && rule.permitLineDescription) {
      items.push({
        category: 'permit',
        description: rule.permitLineDescription,
        scopeDescription: `${rule.permitLineDescription} — contractor to verify local fee schedule.`,
        customerDescription: 'A building permit may be required for this work. The permit fee will be confirmed before work begins.',
        quantity: 1,
        unit: 'ls',
        unitMaterialCost: 0,
        unitLaborCost: 0,
        markupPct: 0,
        sortOrder: sortOrder++,
      })
    }

    // Risk flag advisory lines
    if (mod.riskFlags.includes('structural')) {
      items.push({
        category: 'misc',
        description: 'Structural assessment — required',
        scopeDescription: 'Structural assessment required before proceeding. Consult licensed structural engineer.',
        customerDescription: 'A structural inspection is needed before this work can begin. Cost to be determined.',
        quantity: 1,
        unit: 'ls',
        unitMaterialCost: 0,
        unitLaborCost: 0,
        markupPct: 0,
        sortOrder: sortOrder++,
      })
    }

    if (mod.riskFlags.includes('asbestos_risk')) {
      items.push({
        category: 'misc',
        description: 'Asbestos / hazmat testing — recommended',
        scopeDescription: 'Pre-demolition asbestos or hazmat testing recommended given age of construction.',
        customerDescription: 'Before removing old materials, we recommend testing for asbestos. Cost to be confirmed.',
        quantity: 1,
        unit: 'ls',
        unitMaterialCost: 0,
        unitLaborCost: 0,
        markupPct: 0,
        sortOrder: sortOrder++,
      })
    }

    // Contractor notes as misc line (visible in contractor checklist only)
    if (mod.contractorNotes?.trim()) {
      items.push({
        category: 'misc',
        description: `Note — ${rule.description}`,
        scopeDescription: mod.contractorNotes.trim(),
        customerDescription: '',
        quantity: 1,
        unit: 'ls',
        unitMaterialCost: 0,
        unitLaborCost: 0,
        markupPct: 0,
        sortOrder: sortOrder++,
      })
    }
  }

  return items
}

export function computeLineTotal(
  quantity: number,
  unitMaterialCost: number,
  unitLaborCost: number,
  markupPct: number
): number {
  const material = quantity * unitMaterialCost
  const labor = quantity * unitLaborCost
  const subtotal = material + labor
  return Math.round((subtotal * (1 + markupPct / 100)) * 100) / 100
}

export function computeJobTotals(items: Array<{
  quantity: number
  unitMaterialCost: number
  unitLaborCost: number
  markupPct: number
  isIncluded: boolean
}>) {
  let totalMaterial = 0
  let totalLabor = 0
  let totalMarkup = 0

  for (const item of items) {
    if (!item.isIncluded) continue
    const material = item.quantity * item.unitMaterialCost
    const labor = item.quantity * item.unitLaborCost
    const subtotal = material + labor
    const markup = subtotal * (item.markupPct / 100)
    totalMaterial += material
    totalLabor += labor
    totalMarkup += markup
  }

  return {
    totalMaterial: Math.round(totalMaterial * 100) / 100,
    totalLabor: Math.round(totalLabor * 100) / 100,
    totalMarkup: Math.round(totalMarkup * 100) / 100,
    grandTotal: Math.round((totalMaterial + totalLabor + totalMarkup) * 100) / 100,
  }
}
