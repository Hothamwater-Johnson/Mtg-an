'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

type ActionFn = (
  prev: { error?: string } | null,
  formData: FormData
) => Promise<{ error?: string } | null>

interface Props {
  jobId: string
  initialNotes: string
  action: ActionFn
}

export function QuoteNotes({ jobId, initialNotes, action }: Props) {
  const [state, formAction, pending] = useActionState(action, null)

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{state.error}</p>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <label htmlFor="notes" className="block text-sm font-medium text-gray-900">
          Quote notes <span className="text-gray-400 font-normal">(optional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          defaultValue={initialNotes}
          placeholder="Payment terms, warranty info, exclusions, special conditions…"
          className="w-full rounded-md border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <p className="text-xs text-gray-400">
          These notes appear on the proposal PDF under the total.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <Button type="button" variant="ghost" asChild>
          <Link href={`/jobs/${jobId}/scope`}>← Back to scope</Link>
        </Button>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button type="submit" variant="outline" disabled={pending} className="w-full sm:w-auto">
            {pending ? 'Saving…' : 'Save notes'}
          </Button>
          <Button
            type="submit"
            name="_action"
            value="continue"
            disabled={pending}
            className="w-full sm:w-auto"
          >
            {pending ? 'Saving…' : 'Continue to preview →'}
          </Button>
        </div>
      </div>
    </form>
  )
}
