import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/dashboard/StatusBadge'
import { WizardProgress } from '@/components/dashboard/WizardProgress'
import { formatDate } from '@/lib/utils'

interface JobRow {
  id: string
  job_number: string
  title: string | null
  status: string
  notes: string | null
  site_address_override: string | null
  permit_jurisdiction: string | null
  created_at: string
  clients: { first_name: string; last_name: string; address_line1: string; city: string; state: string } | null
}

interface AreaRow {
  id: string
  area_type: string
  area_label: string | null
  area_order: number
  job_area_modifications: { id: string }[]
}

export default async function JobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job } = await (supabase as any)
    .from('jobs')
    .select('id, job_number, title, status, notes, site_address_override, permit_jurisdiction, created_at, clients ( first_name, last_name, address_line1, city, state )')
    .eq('id', jobId)
    .eq('contractor_id', user!.id)
    .single() as { data: JobRow | null }

  if (!job) notFound()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: areas } = await (supabase as any)
    .from('job_areas')
    .select('id, area_type, area_label, area_order, job_area_modifications ( id )')
    .eq('job_id', jobId)
    .order('area_order', { ascending: true }) as { data: AreaRow[] | null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: packets } = await (supabase as any)
    .from('proposal_packets')
    .select('id, version, generated_at')
    .eq('job_id', jobId)
    .order('version', { ascending: false })
    .limit(1) as { data: { id: string; version: number; generated_at: string }[] | null }

  const hasAreas = (areas?.length ?? 0) > 0
  const allAreasFilled = hasAreas && areas!.every((a) => a.job_area_modifications.length > 0)
  const hasPacket = (packets?.length ?? 0) > 0

  const AREA_LABELS: Record<string, string> = { bathroom: 'Bathroom', entryway: 'Entryway' }

  const wizardSteps = [
    { label: 'Intake', href: `/jobs/new`, status: 'complete' as const },
    {
      label: 'Areas',
      href: `/jobs/${jobId}/areas`,
      status: hasAreas ? 'complete' as const : 'current' as const,
    },
    ...(areas ?? []).map((a) => ({
      label: a.area_label || AREA_LABELS[a.area_type] || a.area_type,
      href: `/jobs/${jobId}/${a.id}`,
      status: a.job_area_modifications.length > 0 ? 'complete' as const : 'current' as const,
    })),
    {
      label: 'Scope',
      href: `/jobs/${jobId}/scope`,
      status: allAreasFilled ? 'upcoming' as const : 'upcoming' as const,
    },
    { label: 'Quote', href: `/jobs/${jobId}/quote`, status: 'upcoming' as const },
    { label: 'Preview', href: `/jobs/${jobId}/preview`, status: 'upcoming' as const },
    { label: 'Send', href: `/jobs/${jobId}/send`, status: 'upcoming' as const },
  ]

  const client = job.clients
  const address = job.site_address_override || (client ? `${client.address_line1}, ${client.city}, ${client.state}` : null)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-4 w-4" />
          Jobs
        </Link>
        <div className="flex items-center gap-3 mt-1">
          <h1 className="text-xl font-semibold text-gray-900">
            {job.title || (client ? `${client.first_name} ${client.last_name}` : 'Untitled job')}
          </h1>
          <StatusBadge status={job.status} />
        </div>
        <p className="text-sm text-gray-400 font-mono mt-0.5">{job.job_number}</p>
      </div>

      <WizardProgress steps={wizardSteps} />

      {/* Job meta */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 grid grid-cols-2 gap-4 text-sm">
        {client && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Client</p>
            <Link href={`/clients/${jobId}`} className="font-medium text-gray-900 hover:underline">
              {client.first_name} {client.last_name}
            </Link>
          </div>
        )}
        {address && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Work site</p>
            <p className="text-gray-700">{address}</p>
          </div>
        )}
        {job.permit_jurisdiction && (
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Permit jurisdiction</p>
            <p className="text-gray-700">{job.permit_jurisdiction}</p>
          </div>
        )}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-0.5">Created</p>
          <p className="text-gray-700">{formatDate(job.created_at)}</p>
        </div>
      </div>

      {/* Areas */}
      <section className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        <div className="px-5 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Areas</h2>
          <Button asChild size="sm" variant="outline">
            <Link href={`/jobs/${jobId}/areas`}>
              {hasAreas ? 'Manage areas' : 'Add areas'}
            </Link>
          </Button>
        </div>
        {!hasAreas ? (
          <div className="px-5 py-6 text-center">
            <p className="text-sm text-gray-500">No areas added yet.</p>
            <Button asChild size="sm" className="mt-3">
              <Link href={`/jobs/${jobId}/areas`}>Add areas →</Link>
            </Button>
          </div>
        ) : (
          areas!.map((area) => (
            <Link
              key={area.id}
              href={`/jobs/${jobId}/${area.id}`}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {area.area_label || AREA_LABELS[area.area_type] || area.area_type}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {area.job_area_modifications.length} modification{area.job_area_modifications.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {area.job_area_modifications.length > 0
                  ? <span className="text-xs text-green-600 font-medium">✓ Filled</span>
                  : <span className="text-xs text-amber-600 font-medium">Needs input</span>
                }
                <ChevronRight className="h-4 w-4 text-gray-300" />
              </div>
            </Link>
          ))
        )}
      </section>

      {/* Next action */}
      {allAreasFilled && (
        <div className="flex justify-end">
          <Button asChild>
            <Link href={`/jobs/${jobId}/scope`}>
              Continue to scope →
            </Link>
          </Button>
        </div>
      )}

      {hasPacket && (
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-blue-900">Proposal packet ready</p>
            <p className="text-xs text-blue-600 mt-0.5">v{packets![0].version} · Generated {formatDate(packets![0].generated_at)}</p>
          </div>
          <Button asChild size="sm">
            <Link href={`/jobs/${jobId}/preview`}>Preview PDF</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
