export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/send'
import { followUpEmailHtml } from '@/lib/email/templates'
import { computeJobTotals } from '@/lib/rule-engine'

export const runtime = 'nodejs'

// Vercel cron hits this with a secret header for authentication.
// The secret is set in vercel.json and CRON_SECRET env var.
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Find jobs that were sent 3 days ago and haven't received a follow-up yet
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
  const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString()

  // Jobs with status='sent', updated_at in the 3-day window, no follow_up email logged
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: jobs } = await (supabase as any)
    .from('jobs')
    .select(`
      id,
      job_number,
      title,
      notes,
      contractor_id,
      updated_at,
      clients ( first_name, last_name, email ),
      email_logs ( template_key )
    `)
    .eq('status', 'sent')
    .gte('updated_at', fourDaysAgo)
    .lte('updated_at', threeDaysAgo) as {
      data: Array<{
        id: string
        job_number: string
        title: string | null
        notes: string | null
        contractor_id: string
        updated_at: string
        clients: { first_name: string; last_name: string; email: string | null } | null
        email_logs: { template_key: string }[]
      }> | null
    }

  if (!jobs?.length) {
    return NextResponse.json({ processed: 0, message: 'No eligible jobs.' })
  }

  // Filter out any jobs that already have a follow_up email
  const eligible = jobs.filter(
    (j) => !j.email_logs.some((l) => l.template_key === 'follow_up')
  )

  let sent = 0
  let failed = 0

  for (const job of eligible) {
    const client = job.clients
    if (!client?.email) continue

    // Contractor profile
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: profile } = await (supabase as any)
      .from('contractor_profiles')
      .select('company_name, display_name, phone, email')
      .eq('id', job.contractor_id)
      .single() as {
        data: { company_name: string; display_name: string | null; phone: string | null; email: string | null } | null
      }

    // Most recent packet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: packets } = await (supabase as any)
      .from('proposal_packets')
      .select('pdf_storage_path')
      .eq('job_id', job.id)
      .order('version', { ascending: false })
      .limit(1) as { data: { pdf_storage_path: string }[] | null }

    if (!packets?.length) continue

    // Create a 7-day signed URL for the follow-up
    const { data: urlData } = await supabase.storage
      .from('pdfs')
      .createSignedUrl(packets[0].pdf_storage_path, 60 * 60 * 24 * 7)

    if (!urlData?.signedUrl) continue

    // Compute grand total
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: items } = await (supabase as any)
      .from('scope_line_items')
      .select('quantity, unit_material_cost, unit_labor_cost, markup_pct, is_included')
      .eq('job_id', job.id) as {
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

    const sentAt = new Date(job.updated_at)
    const daysSinceSent = Math.floor((Date.now() - sentAt.getTime()) / (1000 * 60 * 60 * 24))

    const html = followUpEmailHtml({
      clientFirstName: client.first_name,
      contractorCompany: profile?.company_name ?? 'Your contractor',
      contractorName: profile?.display_name ?? profile?.company_name ?? 'Your contractor',
      contractorPhone: profile?.phone ?? null,
      contractorEmail: profile?.email ?? null,
      jobNumber: job.job_number,
      grandTotal: totals.grandTotal,
      pdfUrl: urlData.signedUrl,
      notes: job.notes,
      daysSinceSent,
    })

    const subject = `Following up — your accessibility proposal (${job.job_number})`

    const result = await sendEmail({
      to: client.email,
      subject,
      html,
      replyTo: profile?.email ?? undefined,
    })

    if (result.error) {
      console.error(`Follow-up failed for job ${job.id}:`, result.error)
      failed++
      continue
    }

    // Log the follow-up
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('email_logs')
      .insert({
        job_id: job.id,
        resend_id: result.id,
        template_key: 'follow_up',
        recipient_email: client.email,
        status: 'sent',
      })

    sent++
  }

  return NextResponse.json({
    processed: eligible.length,
    sent,
    failed,
  })
}
