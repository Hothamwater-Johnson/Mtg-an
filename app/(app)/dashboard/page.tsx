import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { formatDate } from '@/lib/utils'
import { Plus } from 'lucide-react'

interface JobRow {
  id: string
  job_number: string
  title: string | null
  status: string
  updated_at: string
  clients: { first_name: string; last_name: string } | null
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: jobs } = await supabase
    .from('jobs')
    .select('id, job_number, title, status, updated_at, clients ( first_name, last_name )')
    .eq('contractor_id', user!.id)
    .order('updated_at', { ascending: false })
    .limit(50) as { data: JobRow[] | null }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Jobs</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {jobs?.length ?? 0} job{jobs?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Button asChild>
          <Link href="/jobs/new">
            <Plus className="h-4 w-4" />
            New job
          </Link>
        </Button>
      </div>

      {!jobs?.length ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-sm font-medium text-gray-900">No jobs yet</p>
          <p className="text-sm text-gray-500 mt-1">Create your first proposal packet to get started.</p>
          <Button asChild className="mt-4">
            <Link href="/jobs/new">
              <Plus className="h-4 w-4" />
              New job
            </Link>
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-mono">{job.job_number}</span>
                  <StatusBadge status={job.status} />
                </div>
                <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">
                  {job.title || (job.clients ? `${job.clients.first_name} ${job.clients.last_name}` : 'Untitled job')}
                </p>
                {job.clients && (
                  <p className="text-xs text-gray-500">{job.clients.first_name} {job.clients.last_name}</p>
                )}
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="text-xs text-gray-400">{formatDate(job.updated_at)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
