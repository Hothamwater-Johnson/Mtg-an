'use client'

import { useActionState, useRef, useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { updateProfileAction } from './actions'

interface Profile {
  company_name: string
  display_name: string
  license_number: string | null
  phone: string | null
  email: string
  logo_url: string | null
  address_line1: string | null
  city: string | null
  state: string | null
  zip: string | null
  default_labor_rate: number
  default_markup_pct: number
}

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(updateProfileAction, null)
  const fileRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(profile.logo_url)

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setPreviewUrl(URL.createObjectURL(file))
  }

  return (
    <form action={action} className="space-y-8">
      {state?.success && (
        <p className="text-sm text-green-700 bg-green-50 rounded-md px-3 py-2">{state.success}</p>
      )}
      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{state.error}</p>
      )}

      {/* Logo */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Company logo</h2>
        <div className="flex items-center gap-4">
          <div
            className="h-16 w-16 rounded-lg border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden cursor-pointer"
            onClick={() => fileRef.current?.click()}
          >
            {previewUrl ? (
              <Image src={previewUrl} alt="Logo" width={64} height={64} className="object-cover w-full h-full" />
            ) : (
              <span className="text-2xl font-bold text-gray-300">
                {profile.company_name.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
              Upload logo
            </Button>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, or SVG · max 2 MB</p>
          </div>
        </div>
        <input
          ref={fileRef}
          name="logo"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleLogoChange}
        />
      </section>

      {/* Company info */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Company info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="company_name">Company name *</Label>
            <Input id="company_name" name="company_name" required defaultValue={profile.company_name} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="display_name">Your name *</Label>
            <Input id="display_name" name="display_name" required defaultValue={profile.display_name} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="license_number">License number</Label>
            <Input id="license_number" name="license_number" defaultValue={profile.license_number ?? ''} placeholder="e.g. RI-CR-001234" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" type="tel" defaultValue={profile.phone ?? ''} placeholder="(401) 555-0100" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="email">Email *</Label>
            <Input id="email" name="email" type="email" required defaultValue={profile.email} />
          </div>
        </div>
      </section>

      {/* Address */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Business address</h2>
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
          <div className="space-y-1.5 sm:col-span-6">
            <Label htmlFor="address_line1">Street address</Label>
            <Input id="address_line1" name="address_line1" defaultValue={profile.address_line1 ?? ''} placeholder="123 Main St" />
          </div>
          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="city">City</Label>
            <Input id="city" name="city" defaultValue={profile.city ?? ''} />
          </div>
          <div className="space-y-1.5 sm:col-span-1">
            <Label htmlFor="state">State</Label>
            <Input id="state" name="state" maxLength={2} defaultValue={profile.state ?? ''} placeholder="RI" className="uppercase" />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="zip">ZIP</Label>
            <Input id="zip" name="zip" defaultValue={profile.zip ?? ''} placeholder="02903" />
          </div>
        </div>
      </section>

      {/* Defaults */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Proposal defaults</h2>
        <p className="text-xs text-gray-500">These values pre-fill every new job. You can override per-job.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="default_labor_rate">Labor rate ($/hr)</Label>
            <Input id="default_labor_rate" name="default_labor_rate" type="number" min={0} step={0.01} defaultValue={profile.default_labor_rate} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="default_markup_pct">Markup (%)</Label>
            <Input id="default_markup_pct" name="default_markup_pct" type="number" min={0} max={100} step={0.1} defaultValue={profile.default_markup_pct} />
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? 'Saving…' : 'Save profile'}
        </Button>
      </div>
    </form>
  )
}
