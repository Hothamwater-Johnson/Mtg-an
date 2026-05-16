import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SideNav } from '@/components/dashboard/SideNav'

interface Profile {
  company_name: string
  display_name: string
  logo_url: string | null
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('contractor_profiles')
    .select('company_name, display_name, logo_url')
    .eq('id', user.id)
    .single() as { data: Profile | null }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SideNav
        companyName={profile?.company_name ?? 'AccessScope'}
        displayName={profile?.display_name ?? user.email ?? ''}
        logoUrl={profile?.logo_url ?? null}
      />
      <main className="flex-1 min-w-0 p-6 lg:p-8">
        {children}
      </main>
    </div>
  )
}
