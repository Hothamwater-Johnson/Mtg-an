'use client'

import { useActionState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const REFERRAL_SOURCES = [
  { value: 'self', label: 'Self / direct' },
  { value: 'referral', label: 'Referral' },
  { value: 'physician', label: 'Physician / hospital' },
  { value: 'ot', label: 'Occupational therapist' },
  { value: 'other', label: 'Other' },
]

interface Client {
  first_name: string
  last_name: string
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  zip: string
  phone: string | null
  email: string | null
  referral_source: string | null
  referral_notes: string | null
}

type ActionState = { error?: string; fieldErrors?: Record<string, string[]> } | null
type ActionFn = (prev: ActionState, formData: FormData) => Promise<ActionState>

interface ClientFormProps {
  action: ActionFn
  defaultValues?: Partial<Client>
  submitLabel?: string
}

export function ClientForm({ action, defaultValues = {}, submitLabel = 'Save client' }: ClientFormProps) {
  const [state, formAction, pending] = useActionState(action, null)

  function fieldError(name: string) {
    return state?.fieldErrors?.[name]?.[0]
  }

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{state.error}</p>
      )}

      {/* Name */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Client info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="first_name">First name *</Label>
            <Input id="first_name" name="first_name" required defaultValue={defaultValues.first_name ?? ''} />
            {fieldError('first_name') && <p className="text-xs text-red-600">{fieldError('first_name')}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="last_name">Last name *</Label>
            <Input id="last_name" name="last_name" required defaultValue={defaultValues.last_name ?? ''} />
            {fieldError('last_name') && <p className="text-xs text-red-600">{fieldError('last_name')}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={defaultValues.phone ?? ''} placeholder="(401) 555-0100" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" defaultValue={defaultValues.email ?? ''} />
            {fieldError('email') && <p className="text-xs text-red-600">{fieldError('email')}</p>}
          </div>
        </div>
      </section>

      {/* Address */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Home address</h2>
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
          <div className="space-y-1.5 sm:col-span-6">
            <Label htmlFor="address_line1">Street address *</Label>
            <Input id="address_line1" name="address_line1" required defaultValue={defaultValues.address_line1 ?? ''} />
            {fieldError('address_line1') && <p className="text-xs text-red-600">{fieldError('address_line1')}</p>}
          </div>
          <div className="space-y-1.5 sm:col-span-6">
            <Label htmlFor="address_line2">Apt / unit</Label>
            <Input id="address_line2" name="address_line2" defaultValue={defaultValues.address_line2 ?? ''} />
          </div>
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="city">City *</Label>
            <Input id="city" name="city" required defaultValue={defaultValues.city ?? ''} />
            {fieldError('city') && <p className="text-xs text-red-600">{fieldError('city')}</p>}
          </div>
          <div className="space-y-1.5 sm:col-span-1">
            <Label htmlFor="state">State *</Label>
            <Input id="state" name="state" required maxLength={2} defaultValue={defaultValues.state ?? ''} placeholder="RI" className="uppercase" />
            {fieldError('state') && <p className="text-xs text-red-600">{fieldError('state')}</p>}
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="zip">ZIP *</Label>
            <Input id="zip" name="zip" required defaultValue={defaultValues.zip ?? ''} />
            {fieldError('zip') && <p className="text-xs text-red-600">{fieldError('zip')}</p>}
          </div>
        </div>
      </section>

      {/* Referral */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Referral</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="referral_source">How did they hear about you?</Label>
            <Select name="referral_source" defaultValue={defaultValues.referral_source ?? ''}>
              <SelectTrigger id="referral_source">
                <SelectValue placeholder="Select source" />
              </SelectTrigger>
              <SelectContent>
                {REFERRAL_SOURCES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="referral_notes">Notes</Label>
            <Textarea id="referral_notes" name="referral_notes" rows={2} defaultValue={defaultValues.referral_notes ?? ''} placeholder="e.g. Referred by Dr. Johnson at RI Hospital" />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : submitLabel}
        </Button>
      </div>
    </form>
  )
}
