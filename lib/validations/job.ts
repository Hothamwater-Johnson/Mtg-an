import { z } from 'zod'

export const jobIntakeSchema = z.object({
  client_id: z.string().uuid('Select a client'),
  title: z.string().optional(),
  site_address_override: z.string().optional(),
  permit_jurisdiction: z.string().optional(),
  notes: z.string().optional(),
})

export const areaSchema = z.object({
  area_type: z.enum(['bathroom', 'entryway']),
  area_label: z.string().optional(),
  current_condition: z.string().optional(),
  notes: z.string().optional(),
})

export const modificationSchema = z.object({
  modification_key: z.string(),
  is_selected: z.boolean(),
  material_tier: z.enum(['economy', 'standard', 'premium']),
  quantity: z.number().positive().optional(),
  unit: z.string().optional(),
  measurement_notes: z.string().optional(),
  permit_required: z.boolean(),
  risk_flags: z.array(z.string()),
  contractor_notes: z.string().optional(),
  override_unit_cost: z.number().positive().optional(),
  override_labor_cost: z.number().positive().optional(),
  sort_order: z.number().int(),
})

export type JobIntakeFormData = z.infer<typeof jobIntakeSchema>
export type AreaFormData = z.infer<typeof areaSchema>
export type ModificationFormData = z.infer<typeof modificationSchema>
