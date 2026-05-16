'use client'

import { use, useActionState } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveAreasAction } from '../../actions'

const AREA_TYPES = [
  {
    type: 'bathroom',
    title: 'Bathroom',
    description: 'Grab bars, shower conversion, non-slip flooring, door widening, toilet height, lighting',
  },
  {
    type: 'entryway',
    title: 'Entryway',
    description: 'Exterior ramp, handrail, threshold reducer, door widening, landing pad',
  },
]

export default function AreasPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params)
  const boundAction = saveAreasAction.bind(null, jobId)
  const [state, formAction, pending] = useActionState(boundAction, null)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href={`/jobs/${jobId}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-4 w-4" />
          Job overview
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-1">Select areas</h1>
        <p className="text-sm text-gray-500 mt-0.5">Choose which areas of the home are in scope for this job.</p>
      </div>

      <form action={formAction} className="space-y-4">
        {state?.error && (
          <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{state.error}</p>
        )}

        <div className="space-y-3">
          {AREA_TYPES.map(({ type, title, description }) => (
            <label key={type} className="block cursor-pointer">
              <div className="bg-white rounded-xl border border-gray-200 p-5 hover:border-blue-300 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50 transition-colors">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    name="area_types"
                    value={type}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <div className="flex-1 min-w-0 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{description}</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`label_${type}`} className="text-xs">
                        Area label <span className="text-gray-400 font-normal">(optional — e.g. &quot;Master Bathroom&quot;)</span>
                      </Label>
                      <Input
                        id={`label_${type}`}
                        name={`label_${type}`}
                        placeholder={title}
                        className="text-sm"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className="flex justify-between pt-2">
          <Button type="button" variant="ghost" asChild>
            <Link href={`/jobs/${jobId}`}>Back</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving…' : 'Save & fill modifications →'}
          </Button>
        </div>
      </form>
    </div>
  )
}
