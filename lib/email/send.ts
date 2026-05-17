import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder')

export interface SendEmailOptions {
  to: string
  subject: string
  html: string
  from?: string
  replyTo?: string
}

export interface SendEmailResult {
  id: string | null
  error: string | null
}

export async function sendEmail(opts: SendEmailOptions): Promise<SendEmailResult> {
  const from = opts.from ?? process.env.RESEND_FROM_EMAIL ?? 'proposals@accessscope.app'

  if (process.env.NODE_ENV === 'development') {
    console.log('\n📧 [DEV EMAIL]', { to: opts.to, subject: opts.subject, from })
    console.log('--- HTML preview (first 500 chars) ---')
    console.log(opts.html.slice(0, 500))
    return { id: `dev-${Date.now()}`, error: null }
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    })
    if (error) return { id: null, error: error.message }
    return { id: data?.id ?? null, error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return { id: null, error: message }
  }
}
