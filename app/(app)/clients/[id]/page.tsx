import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { ClientForm } from '@/components/forms/ClientForm'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { formatDate } from '@/lib/utils'
import { updateClientAction } from '../actions'

interface ClientRow {
  id: string
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

interface JobRow {
  id: string
  job_number: string
  title: string | null
  status: string
  created_at: string
}

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: client } = await (supabase as any)
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('contractor_id', user!.id)
    .single() as { data: ClientRow | null }

  if (!client) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: jobs } = await (supabase as any)
    .from('jobs')
    .select('id, job_number, title, status, created_at')
    .eq('client_id', id)
    .order('created_at', { ascending: false }) as { data: JobRow[] | null }

  const boundAction = updateClientAction.bind(null, id)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-4 w-4" />
          Clients
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-1">
          {client.first_name} {client.last_name}
        </h1>
      </div>

      {jobs && jobs.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          <div className="px-5 py-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Jobs</h2>
            <Button asChild size="sm" variant="outline">
              <Link href={`/jobs/new?client_id=${id}`}>
                <Plus className="h-3.5 w-3.5" />
                New job
              </Link>
            </Button>
          </div>
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-mono">{job.job_number}</span>
                <span className="text-sm text-gray-900">{job.title ?? 'Untitled job'}</span>
                <StatusBadge status={job.status} />
              </div>
              <span className="text-xs text-gray-400">{formatDate(job.created_at)}</span>
            </Link>
          ))}
        </section>
      )}

      <ClientForm action={boundAction} defaultValues={client} submitLabel="Save changes" />
    </div>
  )
}
