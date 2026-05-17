import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { PreviewClient } from './PreviewClient'

export default async function PreviewPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job } = await (supabase as any)
    .from('jobs')
    .select('id, title, clients ( first_name, last_name )')
    .eq('id', jobId)
    .eq('contractor_id', user.id)
    .single() as {
      data: {
        id: string
        title: string | null
        clients: { first_name: string; last_name: string } | null
      } | null
    }

  if (!job) notFound()

  // Most-recent packet (if any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: packets } = await (supabase as any)
    .from('proposal_packets')
    .select('id, version, generated_at, pdf_storage_path')
    .eq('job_id', jobId)
    .order('version', { ascending: false })
    .limit(1) as { data: { id: string; version: number; generated_at: string; pdf_storage_path: string }[] | null }

  const latestPacket = packets?.[0] ?? null

  // If a packet exists, create a fresh signed URL server-side (1-hour TTL)
  let signedUrl: string | null = null
  if (latestPacket) {
    const { data: urlData } = await supabase.storage
      .from('pdfs')
      .createSignedUrl(latestPacket.pdf_storage_path, 3600)
    signedUrl = urlData?.signedUrl ?? null
  }

  const displayName = job.title || (job.clients
    ? `${job.clients.first_name} ${job.clients.last_name}`
    : 'Untitled job')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href={`/jobs/${jobId}/quote`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-4 w-4" />
          Quote review
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-1">PDF Preview</h1>
        <p className="text-sm text-gray-500 mt-0.5">{displayName}</p>
      </div>

      {latestPacket && signedUrl ? (
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-green-900">
              Proposal v{latestPacket.version} ready
            </p>
            <p className="text-xs text-green-600 mt-0.5">
              Generated {formatDate(latestPacket.generated_at)}
            </p>
          </div>
          <a
            href={signedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-green-700 bg-green-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-800 transition-colors shrink-0"
          >
            Open PDF ↗
          </a>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-sm font-medium text-gray-900">No PDF generated yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Click &ldquo;Generate PDF&rdquo; to create your proposal packet.
          </p>
        </div>
      )}

      <PreviewClient jobId={jobId} hasExisting={!!latestPacket} />

      <div className="flex justify-end">
        <Link
          href={`/jobs/${jobId}/send`}
          className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          Continue to send →
        </Link>
      </div>
    </div>
  )
}
