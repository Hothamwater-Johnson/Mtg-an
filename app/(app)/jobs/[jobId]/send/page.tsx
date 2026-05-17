import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatDate } from '@/lib/utils'
import { sendProposalAction } from './actions'
import { SendForm } from './SendForm'

export default async function SendPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>
  searchParams: Promise<{ sent?: string }>
}) {
  const { jobId } = await params
  const { sent } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job } = await (supabase as any)
    .from('jobs')
    .select('id, title, job_number, notes, clients ( first_name, last_name, email )')
    .eq('id', jobId)
    .eq('contractor_id', user.id)
    .single() as {
      data: {
        id: string
        title: string | null
        job_number: string
        notes: string | null
        clients: { first_name: string; last_name: string; email: string | null } | null
      } | null
    }

  if (!job) notFound()

  // Send history for this job
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: logs } = await (supabase as any)
    .from('email_logs')
    .select('id, template_key, recipient_email, sent_at, status')
    .eq('job_id', jobId)
    .order('sent_at', { ascending: false })
    .limit(10) as {
      data: { id: string; template_key: string; recipient_email: string; sent_at: string; status: string }[] | null
    }

  const client = job.clients
  const displayName = job.title || (client ? `${client.first_name} ${client.last_name}` : 'Untitled job')
  const defaultEmail = client?.email ?? ''
  const defaultSubject = `Your Accessibility Proposal — ${job.job_number}`

  const boundAction = sendProposalAction.bind(null, jobId)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href={`/jobs/${jobId}/preview`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-4 w-4" />
          Preview
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-1">Send proposal</h1>
        <p className="text-sm text-gray-500 mt-0.5">{displayName}</p>
      </div>

      {/* Sent confirmation banner */}
      {sent === '1' && (
        <div className="flex items-start gap-3 bg-green-50 rounded-xl border border-green-200 p-4">
          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-green-900">Proposal sent!</p>
            <p className="text-xs text-green-700 mt-0.5">
              The email is on its way. A follow-up will be sent automatically in 3 days if there&apos;s no reply.
            </p>
          </div>
        </div>
      )}

      <SendForm
        jobId={jobId}
        defaultEmail={defaultEmail}
        defaultSubject={defaultSubject}
        defaultNote={job.notes ?? ''}
        action={boundAction}
      />

      {/* Send history */}
      {(logs?.length ?? 0) > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Send history</p>
          </div>
          <div className="divide-y divide-gray-100">
            {logs!.map((log) => (
              <div key={log.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-gray-900 capitalize">{log.template_key.replace('_', ' ')}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{log.recipient_email}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-500">{formatDate(log.sent_at)}</p>
                  <span className={`inline-block mt-0.5 text-xs font-medium px-1.5 py-0.5 rounded-full ${
                    log.status === 'delivered' || log.status === 'opened'
                      ? 'bg-green-100 text-green-700'
                      : log.status === 'bounced'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {log.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
