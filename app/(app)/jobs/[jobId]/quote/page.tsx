import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

export default async function QuotePage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href={`/jobs/${jobId}`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-4 w-4" />
          Job overview
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-1">Quote</h1>
        <p className="text-sm text-gray-500 mt-0.5">Coming in Phase 5.</p>
      </div>
    </div>
  )
}
