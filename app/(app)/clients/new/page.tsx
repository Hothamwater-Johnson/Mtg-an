import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { ClientForm } from '@/components/forms/ClientForm'
import { createClientAction } from '../actions'

export default function NewClientPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <Link href="/clients" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="h-4 w-4" />
          Clients
        </Link>
        <h1 className="text-xl font-semibold text-gray-900 mt-1">New client</h1>
      </div>
      <ClientForm action={createClientAction} submitLabel="Create client" />
    </div>
  )
}
