import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<string, string> = {
  draft:    'bg-gray-100 text-gray-600',
  sent:     'bg-blue-50 text-blue-700',
  accepted: 'bg-green-50 text-green-700',
  declined: 'bg-red-50 text-red-600',
  archived: 'bg-gray-100 text-gray-400',
}

const STATUS_LABELS: Record<string, string> = {
  draft:    'Draft',
  sent:     'Sent',
  accepted: 'Accepted',
  declined: 'Declined',
  archived: 'Archived',
}

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', STATUS_STYLES[status] ?? STATUS_STYLES.draft)}>
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}
