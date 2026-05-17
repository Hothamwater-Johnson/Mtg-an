'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

interface CheckoutButtonProps {
  type: 'subscription' | 'pack'
  planId?: string
  packId?: string
  label: string
  variant?: 'default' | 'outline'
  className?: string
}

export function CheckoutButton({ type, planId, packId, label, variant = 'default', className }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, planId, packId }),
      })
      const json = await res.json()
      if (!res.ok || !json.url) {
        setError(json.error ?? 'Failed to start checkout.')
      } else {
        window.location.href = json.url
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-1">
      <Button
        onClick={handleClick}
        disabled={loading}
        variant={variant}
        className={className}
      >
        {loading ? 'Loading…' : label}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function PortalButton() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/portal', { method: 'POST' })
      const json = await res.json()
      if (!res.ok || !json.url) {
        setError(json.error ?? 'Could not open billing portal.')
        router.refresh()
      } else {
        window.location.href = json.url
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-1">
      <Button onClick={handleClick} disabled={loading} variant="outline" size="sm">
        {loading ? 'Loading…' : 'Manage billing →'}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
