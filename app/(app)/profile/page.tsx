import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileForm } from './ProfileForm'

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

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('contractor_profiles')
    .select('company_name, display_name, license_number, phone, email, logo_url, address_line1, city, state, zip, default_labor_rate, default_markup_pct')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  if (!profile) redirect('/login')

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your company info and proposal defaults.</p>
      </div>
      <ProfileForm profile={profile} />
    </div>
  )
}
