import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center space-y-4">
        <p className="text-6xl font-bold text-gray-200">404</p>
        <h2 className="text-lg font-semibold text-gray-900">Page not found</h2>
        <p className="text-sm text-gray-500">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/dashboard" className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    </div>
  )
}
