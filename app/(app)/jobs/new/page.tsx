import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { NewJobForm } from './NewJobForm'
import { createJobAction } from '../actions'

interface ClientOption {
  id: string
  first_name: string
  last_name: string
  city: string | null
  state: string | null
}

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string }>
}) {
  const { client_id } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: clients } = await (supabase as any)
    .from('clients')
    .select('id, first_name, last_name, city, state')
    .eq('contractor_id', user.id)
    .order('last_name', { ascending: true }) as { data: ClientOption[] | null }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-4 w-4" />
          Jobs
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-1">New job</h1>
      </div>
      <NewJobForm
        clients={clients ?? []}
        defaultClientId={client_id}
        action={createJobAction}
      />
    </div>
  )
}
