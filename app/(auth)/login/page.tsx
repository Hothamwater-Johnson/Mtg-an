'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { loginAction, magicLinkAction } from './actions'

export default function LoginPage() {
  const [passwordState, passwordAction, passwordPending] = useActionState(loginAction, null)
  const [magicState, magicAction, magicPending] = useActionState(magicLinkAction, null)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
      <form action={passwordAction} className="space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Sign in</h2>

        {passwordState?.error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{passwordState.error}</p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@company.com" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required placeholder="••••••••" />
        </div>

        <Button type="submit" className="w-full" disabled={passwordPending}>
          {passwordPending ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs text-gray-400 bg-white px-2">or</div>
      </div>

      <form action={magicAction} className="space-y-3">
        {magicState?.success && (
          <p className="text-sm text-green-700 bg-green-50 rounded-md px-3 py-2">{magicState.success}</p>
        )}
        {magicState?.error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{magicState.error}</p>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="magic-email">Email magic link</Label>
          <Input id="magic-email" name="email" type="email" autoComplete="email" placeholder="you@company.com" />
        </div>

        <Button type="submit" variant="outline" className="w-full" disabled={magicPending}>
          {magicPending ? 'Sending…' : 'Send magic link'}
        </Button>
      </form>

      <p className="text-center text-sm text-gray-500">
        No account?{' '}
        <Link href="/signup" className="text-blue-600 hover:underline font-medium">
          Sign up
        </Link>
      </p>
    </div>
  )
}
