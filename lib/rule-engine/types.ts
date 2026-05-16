export type MaterialTier = 'economy' | 'standard' | 'premium'
export type LineCategory = 'material' | 'labor' | 'permit' | 'demo' | 'misc'

export type ModificationKey =
  // Bathroom
  | 'grab_bar_tub'
  | 'grab_bar_shower'
  | 'grab_bar_toilet'
  | 'shower_conversion'
  | 'non_slip_floor'
  | 'door_widening_bathroom'
  | 'toilet_riser'
  | 'lighting_upgrade'
  // Entryway
  | 'exterior_ramp'
  | 'handrail'
  | 'threshold_reducer'
  | 'door_widening_entry'
  | 'landing_pad'

export interface ModificationInput {
  key: ModificationKey
  materialTier: MaterialTier
  quantity: number
  unit: string
  permitRequired: boolean
  riskFlags: string[]
  contractorNotes: string
  overrideUnitCost?: number
  overrideLaborCost?: number
}

export interface ScopeLineItem {
  category: LineCategory
  description: string
  scopeDescription: string
  customerDescription: string
  quantity: number
  unit: string
  unitMaterialCost: number
  unitLaborCost: number
  markupPct: number
  sortOrder: number
}

export interface RuleDefinition {
  key: ModificationKey
  description: string
  scopeTemplate: string
  customerTemplate: string
  defaultUnit: string
  laborHoursPerUnit: Record<MaterialTier, number>
  materialCostPerUnit: Record<MaterialTier, number>
  generatesDemoLine: boolean
  demoLaborHours?: number
  permitLineDescription?: string
  requiredMeasurements: string[]
}

export interface ValidationError {
  modificationKey: ModificationKey
  message: string
}
