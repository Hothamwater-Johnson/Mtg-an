'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type ActionFn = (
  prev: { error?: string } | null,
  formData: FormData
) => Promise<{ error?: string } | null>

interface Props {
  jobId: string
  defaultEmail: string
  defaultSubject: string
  defaultNote: string
  action: ActionFn
}

export function SendForm({ jobId, defaultEmail, defaultSubject, defaultNote, action }: Props) {
  const [state, formAction, pending] = useActionState(action, null)

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{state.error}</p>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="to_email">Recipient email</Label>
          <Input
            id="to_email"
            name="to_email"
            type="email"
            required
            defaultValue={defaultEmail}
            placeholder="client@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            name="subject"
            required
            defaultValue={defaultSubject}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="body_note">
            Additional note <span className="text-gray-400 font-normal">(optional)</span>
          </Label>
          <Textarea
            id="body_note"
            name="body_note"
            rows={3}
            defaultValue={defaultNote}
            placeholder="Any extra context for the client — timeline, next steps, questions to answer…"
          />
          <p className="text-xs text-gray-400">Appears in the email alongside the proposal summary.</p>
        </div>
      </div>

      <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
        <p className="text-sm font-medium text-blue-900">What gets sent</p>
        <ul className="mt-2 space-y-1 text-sm text-blue-700 list-disc list-inside">
          <li>Branded email with proposal summary and grand total</li>
          <li>PDF link valid for 7 days</li>
          <li>Your reply-to address so the client can respond directly</li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <Button type="button" variant="ghost" asChild>
          <Link href={`/jobs/${jobId}/preview`}>← Back to preview</Link>
        </Button>
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? 'Sending…' : 'Send proposal →'}
        </Button>
      </div>
    </form>
  )
}
