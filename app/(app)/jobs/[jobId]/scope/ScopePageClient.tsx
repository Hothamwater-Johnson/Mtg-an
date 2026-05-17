'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScopeLineItemTable } from '@/components/scope/ScopeLineItemTable'
import type { ScopeItem, AreaGroup } from '@/components/scope/ScopeLineItemTable'
import { saveScopeTableAction } from './actions'

interface Props {
  jobId: string
  items: ScopeItem[]
  areas: AreaGroup[]
}

export function ScopePageClient({ jobId, items, areas }: Props) {
  const router = useRouter()
  const [generating, startGenerate] = useTransition()
  const [generateError, setGenerateError] = useState<string | null>(null)

  async function handleGenerate() {
    setGenerateError(null)
    startGenerate(async () => {
      const res = await fetch(`/api/jobs/${jobId}/scope`, { method: 'POST' })
      const json = await res.json()
      if (!res.ok) {
        setGenerateError(json.error ?? 'Failed to generate scope.')
      } else {
        router.refresh()
      }
    })
  }

  const boundSave = saveScopeTableAction.bind(null, jobId)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <Link href={`/jobs/${jobId}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ChevronLeft className="h-4 w-4" />
            Job overview
          </Link>
          <h1 className="text-xl font-semibold text-gray-900 mt-1">Scope of work</h1>
          {items.length > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">{items.length} line items — edit descriptions, quantities, or costs, then save.</p>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={generating}
        >
          <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
          {items.length > 0 ? 'Regenerate' : 'Generate scope'}
        </Button>
      </div>

      {generateError && (
        <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{generateError}</p>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-sm font-medium text-gray-900">No scope generated yet</p>
          <p className="text-sm text-gray-500 mt-1">
            Click &ldquo;Generate scope&rdquo; to build line items from your area modifications.
          </p>
          <Button className="mt-4" onClick={handleGenerate} disabled={generating}>
            {generating ? 'Generating…' : 'Generate scope'}
          </Button>
        </div>
      ) : (
        <ScopeLineItemTable
          items={items}
          areas={areas}
          saveAction={boundSave}
          jobId={jobId}
        />
      )}
    </div>
  )
}
