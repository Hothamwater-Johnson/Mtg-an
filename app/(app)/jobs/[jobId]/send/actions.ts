'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { proposalEmailHtml } from '@/lib/email/templates'
import { computeJobTotals } from '@/lib/rule-engine'

export async function sendProposalAction(
  jobId: string,
  _prev: { error?: string } | null,
  formData: FormData
): Promise<{ error?: string } | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const toEmail = (formData.get('to_email') as string | null)?.trim()
  const subject = (formData.get('subject') as string | null)?.trim()
  const bodyNote = (formData.get('body_note') as string | null)?.trim() || null

  if (!toEmail || !subject) return { error: 'Recipient and subject are required.' }

  // ── Verify job ownership ──────────────────────────────────────────────────
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

  if (!job) return { error: 'Job not found.' }

  // ── Require an existing proposal packet ───────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: packets } = await (supabase as any)
    .from('proposal_packets')
    .select('id, version, pdf_storage_path')
    .eq('job_id', jobId)
    .order('version', { ascending: false })
    .limit(1) as { data: { id: string; version: number; pdf_storage_path: string }[] | null }

  if (!packets?.length) {
    return { error: 'No PDF generated yet. Go to Preview and generate the PDF first.' }
  }

  const packet = packets[0]

  // Create a 7-day signed URL for the client
  const { data: urlData, error: urlError } = await supabase.storage
    .from('pdfs')
    .createSignedUrl(packet.pdf_storage_path, 60 * 60 * 24 * 7)

  if (urlError || !urlData?.signedUrl) {
    return { error: 'Could not create PDF link. Please try again.' }
  }

  // ── Contractor profile ────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('contractor_profiles')
    .select('company_name, display_name, phone, email')
    .eq('id', user.id)
    .single() as {
      data: { company_name: string; display_name: string | null; phone: string | null; email: string | null } | null
    }

  // ── Compute grand total from included scope items ─────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: items } = await (supabase as any)
    .from('scope_line_items')
    .select('quantity, unit_material_cost, unit_labor_cost, markup_pct, is_included')
    .eq('job_id', jobId) as {
      data: { quantity: number; unit_material_cost: number; unit_labor_cost: number; markup_pct: number; is_included: boolean }[] | null
    }

  const totals = computeJobTotals(
    (items ?? []).map((r) => ({
      quantity: r.quantity,
      unitMaterialCost: r.unit_material_cost,
      unitLaborCost: r.unit_labor_cost,
      markupPct: r.markup_pct,
      isIncluded: r.is_included,
    }))
  )

  // ── Build + send email ────────────────────────────────────────────────────
  const clientFirst = job.clients?.first_name ?? 'there'
  const contractorName = profile?.display_name ?? profile?.company_name ?? 'Your contractor'
  const contractorCompany = profile?.company_name ?? 'AccessScope'

  const html = proposalEmailHtml({
    clientFirstName: clientFirst,
    contractorCompany,
    contractorName,
    contractorPhone: profile?.phone ?? null,
    contractorEmail: profile?.email ?? null,
    jobNumber: job.job_number,
    grandTotal: totals.grandTotal,
    pdfUrl: urlData.signedUrl,
    notes: bodyNote || job.notes,
  })

  const result = await sendEmail({
    to: toEmail,
    subject,
    html,
    replyTo: profile?.email ?? undefined,
  })

  if (result.error) return { error: `Email failed: ${result.error}` }

  // ── Log to email_logs ─────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('email_logs')
    .insert({
      job_id: jobId,
      resend_id: result.id,
      template_key: 'proposal',
      recipient_email: toEmail,
      status: 'sent',
    })

  // ── Update job status to 'sent' ───────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from('jobs')
    .update({ status: 'sent' })
    .eq('id', jobId)
    .eq('contractor_id', user.id)

  redirect(`/jobs/${jobId}?sent=1`)
}
