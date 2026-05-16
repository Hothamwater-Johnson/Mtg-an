import Link from 'next/link'

export default function MagicLinkPage() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 text-center space-y-3">
      <div className="text-3xl">✉️</div>
      <h2 className="text-base font-semibold text-gray-900">Magic link sent</h2>
      <p className="text-sm text-gray-600">
        Check your inbox and click the link to sign in. The link expires in 1 hour.
      </p>
      <Link href="/login" className="text-sm text-blue-600 hover:underline">
        Back to sign in
      </Link>
    </div>
  )
}
