import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Plus, ChevronRight } from 'lucide-react'

interface ClientRow {
  id: string
  first_name: string
  last_name: string
  city: string | null
  state: string | null
  phone: string | null
  email: string | null
  created_at: string
}

export default async function ClientsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: clients } = await supabase
    .from('clients')
    .select('id, first_name, last_name, city, state, phone, email, created_at')
    .eq('contractor_id', user!.id)
    .order('last_name', { ascending: true }) as { data: ClientRow[] | null }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Clients</h1>
          <p className="text-sm text-gray-500 mt-0.5">{clients?.length ?? 0} client{clients?.length !== 1 ? 's' : ''}</p>
        </div>
        <Button asChild>
          <Link href="/clients/new">
            <Plus className="h-4 w-4" />
            New client
          </Link>
        </Button>
      </div>

      {!clients?.length ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-sm font-medium text-gray-900">No clients yet</p>
          <p className="text-sm text-gray-500 mt-1">Add your first client to start creating proposals.</p>
          <Button asChild className="mt-4">
            <Link href="/clients/new">
              <Plus className="h-4 w-4" />
              New client
            </Link>
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {clients.map((c) => (
            <Link
              key={c.id}
              href={`/clients/${c.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900">{c.first_name} {c.last_name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {[c.city, c.state].filter(Boolean).join(', ')}
                  {c.phone && ` · ${c.phone}`}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-gray-300 shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
