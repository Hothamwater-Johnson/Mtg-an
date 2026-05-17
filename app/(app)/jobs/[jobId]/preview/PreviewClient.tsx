'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  jobId: string
  hasExisting: boolean
}

export function PreviewClient({ jobId, hasExisting }: Props) {
  const router = useRouter()
  const [generating, startGenerate] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [freshUrl, setFreshUrl] = useState<string | null>(null)

  async function handleGenerate() {
    setError(null)
    setFreshUrl(null)
    startGenerate(async () => {
      const res = await fetch(`/api/jobs/${jobId}/pdf`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setError(json.error ?? 'PDF generation failed. Please try again.')
      } else {
        setFreshUrl(json.signedUrl)
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-4">
      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
      )}

      {freshUrl && (
        <div className="flex items-center gap-3 bg-blue-50 rounded-xl border border-blue-200 p-4">
          <FileText className="h-5 w-5 text-blue-600 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-900">New PDF generated</p>
            <p className="text-xs text-blue-600 mt-0.5">Link valid for 1 hour</p>
          </div>
          <a
            href={freshUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center justify-center gap-1 rounded-md border border-blue-700 bg-blue-700 px-3 py-2 text-sm font-medium text-white hover:bg-blue-800 transition-colors"
          >
            Open ↗
          </a>
        </div>
      )}

      <div className="flex justify-start">
        <Button
          variant="outline"
          onClick={handleGenerate}
          disabled={generating}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
          {generating ? 'Generating…' : hasExisting ? 'Regenerate PDF' : 'Generate PDF'}
        </Button>
      </div>
    </div>
  )
}
