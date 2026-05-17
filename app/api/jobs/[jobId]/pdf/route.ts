import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateProposalPdf } from '@/lib/pdf/generate'
import { computeJobTotals } from '@/lib/rule-engine'
import type { ProposalData } from '@/lib/pdf/generate'

export const runtime = 'nodejs'

interface ScopeRow {
  id: string
  job_area_id: string | null
  category: string
  description: string
  quantity: number
  unit: string | null
  unit_material_cost: number
  unit_labor_cost: number
  markup_pct: number
  is_included: boolean
}

function lineTotal(item: ScopeRow): number {
  const sub = item.quantity * (item.unit_material_cost + item.unit_labor_cost)
  return Math.round(sub * (1 + item.markup_pct / 100) * 100) / 100
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // ── Subscription + credit gate ────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: sub } = await (supabase as any)
    .from('subscriptions')
    .select('status, plan_id, packet_credits')
    .eq('contractor_id', user.id)
    .maybeSingle() as { data: { status: string; plan_id: string | null; packet_credits: number } | null }

  const activeStatuses = ['active', 'trialing']
  if (!sub || !activeStatuses.includes(sub.status)) {
    return NextResponse.json(
      { error: 'An active subscription is required to generate proposals. Please visit /billing to subscribe.' },
      { status: 402 }
    )
  }

  const isUnlimited = sub.plan_id === 'team_monthly'
  if (!isUnlimited && sub.packet_credits <= 0) {
    return NextResponse.json(
      { error: 'No proposal credits remaining. Purchase more at /billing.' },
      { status: 402 }
    )
  }

  // ── Rate limit: max 1 PDF generation per job per 30s ─────────────────────
  const thirtySecondsAgo = new Date(Date.now() - 30_000).toISOString()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recentPacket } = await (supabase as any)
    .from('proposal_packets')
    .select('id')
    .eq('job_id', jobId)
    .gte('generated_at', thirtySecondsAgo)
    .limit(1)
    .maybeSingle() as { data: { id: string } | null }

  if (recentPacket) {
    return NextResponse.json(
      { error: 'Please wait 30 seconds before generating another PDF for this job.' },
      { status: 429 }
    )
  }

  // ── Fetch job + client ────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: job } = await (supabase as any)
    .from('jobs')
    .select('id, title, notes, site_address_override, clients ( first_name, last_name, address_line1, city, state, zip, phone, email )')
    .eq('id', jobId)
    .eq('contractor_id', user.id)
    .single() as {
      data: {
        id: string
        title: string | null
        notes: string | null
        site_address_override: string | null
        clients: {
          first_name: string
          last_name: string
          address_line1: string
          city: string
          state: string
          zip: string
          phone: string | null
          email: string | null
        } | null
      } | null
    }

  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 })

  // ── Fetch contractor profile ───────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile } = await (supabase as any)
    .from('contractor_profiles')
    .select('company_name, display_name, phone, email, logo_url')
    .eq('id', user.id)
    .single() as {
      data: {
        company_name: string
        display_name: string | null
        phone: string | null
        email: string | null
        logo_url: string | null
      } | null
    }

  // ── Fetch areas ───────────────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: areas } = await (supabase as any)
    .from('job_areas')
    .select('id, area_type, area_label, area_order')
    .eq('job_id', jobId)
    .order('area_order', { ascending: true }) as {
      data: { id: string; area_type: string; area_label: string | null; area_order: number }[] | null
    }

  // ── Fetch included scope line items ───────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: items } = await (supabase as any)
    .from('scope_line_items')
    .select('id, job_area_id, category, description, quantity, unit, unit_material_cost, unit_labor_cost, markup_pct, is_included')
    .eq('job_id', jobId)
    .eq('is_included', true)
    .order('sort_order', { ascending: true }) as { data: ScopeRow[] | null }

  const includedItems = items ?? []
  if (!includedItems.length) {
    return NextResponse.json({ error: 'No included line items. Generate and save scope first.' }, { status: 400 })
  }

  const AREA_LABELS: Record<string, string> = { bathroom: 'Bathroom', entryway: 'Entryway' }
  const areaMap = Object.fromEntries((areas ?? []).map((a) => [
    a.id,
    a.area_label || AREA_LABELS[a.area_type] || a.area_type,
  ]))

  // Group items by area preserving area order
  const areaOrder = (areas ?? []).map((a) => a.id)
  const grouped: Record<string, ScopeRow[]> = {}
  for (const item of includedItems) {
    const key = item.job_area_id ?? '__no_area__'
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(item)
  }

  const sortedAreaIds = [...areaOrder, ...Object.keys(grouped).filter((k) => !areaOrder.includes(k))]

  const proposalAreas: ProposalData['areas'] = sortedAreaIds
    .filter((id) => grouped[id]?.length)
    .map((id) => {
      const rows = grouped[id]
      return {
        id,
        label: areaMap[id] ?? 'General',
        items: rows.map((r) => ({
          id: r.id,
          category: r.category,
          description: r.description,
          quantity: r.quantity,
          unit: r.unit ?? 'each',
          lineTotal: lineTotal(r),
        })),
        areaTotal: rows.reduce((sum, r) => sum + lineTotal(r), 0),
      }
    })

  const totals = computeJobTotals(
    includedItems.map((r) => ({
      quantity: r.quantity,
      unitMaterialCost: r.unit_material_cost,
      unitLaborCost: r.unit_labor_cost,
      markupPct: r.markup_pct,
      isIncluded: true,
    }))
  )

  const client = job.clients
  if (!client) return NextResponse.json({ error: 'Job has no client attached.' }, { status: 400 })

  const jobNumberRes = await (supabase as any)
    .from('jobs')
    .select('job_number')
    .eq('id', jobId)
    .single() as { data: { job_number: string } | null }

  const proposalData: ProposalData = {
    jobNumber: jobNumberRes.data?.job_number ?? jobId,
    title: job.title,
    generatedAt: new Date().toISOString(),
    contractor: {
      companyName: profile?.company_name ?? 'Your Company',
      displayName: profile?.display_name ?? '',
      phone: profile?.phone ?? null,
      email: profile?.email ?? null,
      logoUrl: profile?.logo_url ?? null,
    },
    client: {
      firstName: client.first_name,
      lastName: client.last_name,
      addressLine1: client.address_line1,
      city: client.city,
      state: client.state,
      zip: client.zip,
      phone: client.phone,
      email: client.email,
    },
    siteAddress: job.site_address_override,
    notes: job.notes,
    areas: proposalAreas,
    totals,
  }

  // ── Generate PDF buffer ───────────────────────────────────────────────────
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateProposalPdf(proposalData)
  } catch (err) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: 'PDF generation failed.' }, { status: 500 })
  }

  // ── Determine version number ──────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingPackets } = await (supabase as any)
    .from('proposal_packets')
    .select('version')
    .eq('job_id', jobId)
    .order('version', { ascending: false })
    .limit(1) as { data: { version: number }[] | null }

  const version = (existingPackets?.[0]?.version ?? 0) + 1
  const storagePath = `pdfs/${user.id}/${jobId}/proposal_v${version}.pdf`

  // ── Upload to Supabase Storage ────────────────────────────────────────────
  const { error: uploadError } = await supabase.storage
    .from('pdfs')
    .upload(storagePath, pdfBuffer, {
      contentType: 'application/pdf',
      upsert: false,
    })

  if (uploadError) {
    console.error('Storage upload error:', uploadError)
    return NextResponse.json({ error: 'Failed to upload PDF.' }, { status: 500 })
  }

  // ── Insert proposal_packets row ───────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: insertError } = await (supabase as any)
    .from('proposal_packets')
    .insert({
      job_id: jobId,
      version,
      pdf_storage_path: storagePath,
      generated_at: new Date().toISOString(),
    })

  if (insertError) {
    console.error('Packet insert error:', insertError)
    return NextResponse.json({ error: 'Failed to record packet.' }, { status: 500 })
  }

  // ── Decrement credit (non-unlimited plans only) ───────────────────────────
  if (!isUnlimited) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('subscriptions')
      .update({ packet_credits: sub.packet_credits - 1 })
      .eq('contractor_id', user.id)
  }

  // ── Create signed URL (1 hour) ────────────────────────────────────────────
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from('pdfs')
    .createSignedUrl(storagePath, 3600)

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return NextResponse.json({ error: 'Failed to create signed URL.' }, { status: 500 })
  }

  return NextResponse.json({
    version,
    signedUrl: signedUrlData.signedUrl,
    storagePath,
  })
}
