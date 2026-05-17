export interface ProposalEmailData {
  clientFirstName: string
  contractorCompany: string
  contractorName: string
  contractorPhone: string | null
  contractorEmail: string | null
  jobNumber: string
  grandTotal: number
  pdfUrl: string
  notes: string | null
}

export interface FollowUpEmailData extends ProposalEmailData {
  daysSinceSent: number
}

function base(content: string, footer: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:32px 16px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
      <!-- Header -->
      <tr><td style="background:#2563eb;padding:24px 32px;">
        <p style="margin:0;font-size:18px;font-weight:700;color:#ffffff;">AccessScope</p>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:32px;">
        ${content}
      </td></tr>
      <!-- Footer -->
      <tr><td style="padding:20px 32px;background:#f3f4f6;border-top:1px solid #e5e7eb;">
        ${footer}
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`
}

export function proposalEmailHtml(data: ProposalEmailData): string {
  const { clientFirstName, contractorCompany, contractorName, contractorPhone, contractorEmail, jobNumber, grandTotal, pdfUrl, notes } = data
  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(grandTotal)

  const content = `
    <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${clientFirstName},</p>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
      ${contractorName} at <strong>${contractorCompany}</strong> has prepared an accessibility modification proposal for your home.
      Please review the details below.
    </p>

    <!-- Proposal card -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:28px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#60a5fa;letter-spacing:0.08em;text-transform:uppercase;">Proposal</p>
        <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#1e3a8a;">${jobNumber}</p>
        <p style="margin:0 0 4px;font-size:11px;color:#93c5fd;text-transform:uppercase;letter-spacing:0.08em;">Total Estimate</p>
        <p style="margin:0;font-size:28px;font-weight:700;color:#1d4ed8;">${formatted}</p>
      </td></tr>
    </table>

    ${notes ? `<p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.6;background:#f9fafb;border-left:3px solid #d1d5db;padding:12px 16px;border-radius:0 6px 6px 0;">${notes.replace(/\n/g, '<br>')}</p>` : ''}

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td align="center">
        <a href="${pdfUrl}" target="_blank"
           style="display:inline-block;background:#2563eb;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
          View Proposal PDF ↗
        </a>
      </td></tr>
    </table>

    <p style="margin:0;font-size:13px;color:#6b7280;text-align:center;">
      Questions? Reply to this email or contact us directly.
    </p>
  `

  const contactLines = [contractorPhone, contractorEmail].filter(Boolean).join(' · ')
  const footer = `
    <p style="margin:0;font-size:12px;color:#6b7280;">${contractorCompany}</p>
    ${contactLines ? `<p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">${contactLines}</p>` : ''}
    <p style="margin:8px 0 0;font-size:11px;color:#d1d5db;">This proposal was prepared using AccessScope · The PDF link expires in 7 days.</p>
  `
  return base(content, footer)
}

export function followUpEmailHtml(data: FollowUpEmailData): string {
  const { clientFirstName, contractorCompany, contractorName, contractorPhone, contractorEmail, jobNumber, grandTotal, pdfUrl } = data
  const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(grandTotal)

  const content = `
    <p style="margin:0 0 16px;font-size:16px;color:#111827;">Hi ${clientFirstName},</p>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;line-height:1.6;">
      Just following up on the accessibility modification proposal ${contractorName} at <strong>${contractorCompany}</strong> sent you.
      We want to make sure you had a chance to review it and answer any questions you may have.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f9ff;border:1px solid #bfdbfe;border-radius:8px;margin-bottom:28px;">
      <tr><td style="padding:20px 24px;">
        <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#60a5fa;letter-spacing:0.08em;text-transform:uppercase;">Proposal</p>
        <p style="margin:0 0 12px;font-size:14px;font-weight:600;color:#1e3a8a;">${jobNumber}</p>
        <p style="margin:0 0 4px;font-size:11px;color:#93c5fd;text-transform:uppercase;letter-spacing:0.08em;">Total Estimate</p>
        <p style="margin:0;font-size:28px;font-weight:700;color:#1d4ed8;">${formatted}</p>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td align="center">
        <a href="${pdfUrl}" target="_blank"
           style="display:inline-block;background:#2563eb;color:#ffffff;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;">
          View Proposal PDF ↗
        </a>
      </td></tr>
    </table>

    <p style="margin:0;font-size:13px;color:#6b7280;text-align:center;">
      No action needed if you&apos;re not interested — we understand.
    </p>
  `

  const contactLines = [contractorPhone, contractorEmail].filter(Boolean).join(' · ')
  const footer = `
    <p style="margin:0;font-size:12px;color:#6b7280;">${contractorCompany}</p>
    ${contactLines ? `<p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">${contactLines}</p>` : ''}
  `
  return base(content, footer)
}
