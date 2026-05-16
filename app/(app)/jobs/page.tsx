import { redirect } from 'next/navigation'

// Jobs list lives on /dashboard for now
export default function JobsPage() {
  redirect('/dashboard')
}
