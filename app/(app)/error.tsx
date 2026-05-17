'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="max-w-md mx-auto mt-16 text-center space-y-4">
      <p className="text-4xl">⚠️</p>
      <h2 className="text-lg font-semibold text-gray-900">Something went wrong</h2>
      <p className="text-sm text-gray-500">
        An unexpected error occurred. If this keeps happening, please contact support.
      </p>
      {error.digest && (
        <p className="text-xs text-gray-300 font-mono">{error.digest}</p>
      )}
      <Button onClick={reset} variant="outline">Try again</Button>
    </div>
  )
}
