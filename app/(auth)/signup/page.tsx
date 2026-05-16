'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { signupAction } from './actions'

export default function SignupPage() {
  const [state, action, pending] = useActionState(signupAction, null)

  if (state?.success) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center space-y-3">
        <div className="text-3xl">📬</div>
        <h2 className="text-base font-semibold text-gray-900">Check your email</h2>
        <p className="text-sm text-gray-600">{state.success}</p>
        <Link href="/login" className="text-sm text-blue-600 hover:underline">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
      <h2 className="text-base font-semibold text-gray-900">Create your account</h2>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{state.error}</p>
      )}

      <form action={action} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="company_name">Company name</Label>
            <Input id="company_name" name="company_name" required placeholder="Ace Remodeling" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="display_name">Your name</Label>
            <Input id="display_name" name="display_name" required placeholder="Jane Smith" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="jane@aceremolding.com" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="new-password" required placeholder="8+ characters" minLength={8} />
        </div>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  )
}
