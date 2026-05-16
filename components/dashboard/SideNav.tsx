'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { logoutAction } from '@/app/(app)/actions'
import {
  LayoutDashboard,
  Users,
  FolderOpen,
  Settings,
  CreditCard,
  LogOut,
  Menu,
  X,
} from 'lucide-react'

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/jobs', label: 'Jobs', icon: FolderOpen },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/billing', label: 'Billing', icon: CreditCard },
  { href: '/profile', label: 'Settings', icon: Settings },
]

interface SideNavProps {
  companyName: string
  displayName: string
  logoUrl: string | null
}

export function SideNav({ companyName, displayName, logoUrl }: SideNavProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  const initial = companyName.charAt(0).toUpperCase()

  const drawerContent = (
    <>
      {/* Logo / company header */}
      <div className="px-4 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5 min-w-0">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={companyName} className="h-8 w-8 rounded object-cover shrink-0" />
          ) : (
            <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initial}
            </div>
          )}
          <span className="text-sm font-semibold text-gray-900 truncate">{companyName}</span>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={() => setOpen(false)}
          className="md:hidden ml-2 p-2 rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-3 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className={cn(
                // py-3 = ~44px touch target
                'flex items-center gap-3 rounded-md px-3 py-3 text-sm font-medium transition-colors',
                active
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User / sign out */}
      <div className="px-3 py-4 border-t border-gray-100">
        <p className="px-3 text-xs text-gray-400 truncate mb-1">{displayName}</p>
        <form action={logoutAction}>
          <button
            type="submit"
            className="flex w-full items-center gap-3 rounded-md px-3 py-3 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <LogOut className="h-5 w-5 shrink-0" />
            Sign out
          </button>
        </form>
      </div>
    </>
  )

  return (
    <>
      {/* ── Mobile top bar ────────────────────────────────────────────── */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <button
          onClick={() => setOpen(true)}
          className="p-2 -ml-2 rounded-md text-gray-500 hover:bg-gray-100"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold text-gray-900">{companyName}</span>
        {/* Right spacer keeps title centered */}
        <div className="w-9" />
      </div>

      {/* ── Backdrop (mobile) ─────────────────────────────────────────── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <aside
        className={cn(
          // Shared
          'bg-white flex flex-col',
          // Desktop: static, always visible
          'md:static md:w-56 md:shrink-0 md:min-h-screen md:border-r md:border-gray-200 md:translate-x-0',
          // Mobile: fixed overlay, slides in from left
          'fixed inset-y-0 left-0 z-50 w-72 shadow-xl transition-transform duration-200 ease-in-out',
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        {drawerContent}
      </aside>
    </>
  )
}
