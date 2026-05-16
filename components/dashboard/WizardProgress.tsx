import { cn } from '@/lib/utils'
import { Check } from 'lucide-react'

interface Step {
  label: string
  href: string
  status: 'complete' | 'current' | 'upcoming'
}

export function WizardProgress({ steps }: { steps: Step[] }) {
  return (
    <nav className="flex items-center gap-1 flex-wrap">
      {steps.map((step, i) => (
        <div key={step.href} className="flex items-center gap-1">
          {i > 0 && <span className="text-gray-300 text-xs">›</span>}
          <a
            href={step.status !== 'upcoming' ? step.href : undefined}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
              step.status === 'complete' && 'bg-green-50 text-green-700 hover:bg-green-100',
              step.status === 'current' && 'bg-blue-600 text-white',
              step.status === 'upcoming' && 'bg-gray-100 text-gray-400 cursor-default',
            )}
          >
            {step.status === 'complete' && <Check className="h-3 w-3" />}
            {step.label}
          </a>
        </div>
      ))}
    </nav>
  )
}
