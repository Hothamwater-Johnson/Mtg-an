'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface ClientOption {
  id: string
  first_name: string
  last_name: string
  city: string | null
  state: string | null
}

type ActionFn = (prev: { error?: string } | null, formData: FormData) => Promise<{ error?: string } | null>

interface Props {
  clients: ClientOption[]
  defaultClientId?: string
  action: ActionFn
}

export function NewJobForm({ clients, defaultClientId, action }: Props) {
  const [state, formAction, pending] = useActionState(action, null)

  return (
    <form action={formAction} className="space-y-6">
      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{state.error}</p>
      )}

      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Client</h2>

        {clients.length === 0 ? (
          <div className="text-sm text-gray-500">
            No clients yet.{' '}
            <Link href="/clients/new" className="text-blue-600 hover:underline">
              Create a client first
            </Link>
            .
          </div>
        ) : (
          <div className="space-y-1.5">
            <Label htmlFor="client_id">Select client *</Label>
            <select
              id="client_id"
              name="client_id"
              required
              defaultValue={defaultClientId ?? ''}
              className="flex h-9 w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <option value="">Choose a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.last_name}, {c.first_name}
                  {c.city ? ` — ${c.city}${c.state ? `, ${c.state}` : ''}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Job details</h2>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="title">Job title <span className="text-gray-400 font-normal">(optional)</span></Label>
            <Input id="title" name="title" placeholder="e.g. Johnson Bathroom & Entry" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="site_address_override">Work site address <span className="text-gray-400 font-normal">(if different from client address)</span></Label>
            <Input id="site_address_override" name="site_address_override" placeholder="Leave blank to use client address" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="permit_jurisdiction">Permit jurisdiction</Label>
            <Input id="permit_jurisdiction" name="permit_jurisdiction" placeholder="e.g. City of Providence, RI" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="notes">Internal notes</Label>
            <Textarea id="notes" name="notes" rows={3} placeholder="Notes visible to you only — not included in the proposal." />
          </div>
        </div>
      </section>

      <div className="flex justify-between">
        <Button type="button" variant="ghost" asChild>
          <Link href="/dashboard">Cancel</Link>
        </Button>
        <Button type="submit" disabled={pending || clients.length === 0}>
          {pending ? 'Creating…' : 'Create job →'}
        </Button>
      </div>
    </form>
  )
}
