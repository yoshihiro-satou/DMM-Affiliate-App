'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, Heart, Search, User } from 'lucide-react'

const NO_NAV_PREFIXES = ['/age-check', '/login', '/auth']

const tabs = [
  { href: '/', label: 'ホーム', Icon: Home, exact: true },
  { href: '/discover', label: '探す', Icon: Compass, exact: false },
  { href: '/favorites', label: 'お気に入り', Icon: Heart, exact: false },
  { href: '/search', label: '検索', Icon: Search, exact: false },
  { href: '/mypage', label: 'マイページ', Icon: User, exact: false },
] as const

export function BottomNav() {
  const pathname = usePathname()

  if (NO_NAV_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return null
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/8 bg-[#0d0d0d]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex h-16 items-stretch">
        {tabs.map(({ href, label, Icon, exact }) => {
          const isActive = exact
            ? pathname === href
            : pathname === href || pathname.startsWith(href + '/')

          return (
            <Link
              key={href}
              href={href}
              className="relative flex flex-1 flex-col items-center justify-center gap-0.5 transition-opacity active:opacity-60"
              style={{ minHeight: '44px', WebkitTapHighlightColor: 'transparent' }}
            >
              {isActive && (
                <span className="absolute inset-x-3 top-0 h-px bg-red-600" />
              )}
              <Icon
                size={22}
                strokeWidth={isActive ? 2 : 1.5}
                className={isActive ? 'text-white' : 'text-white/30'}
              />
              <span
                className={`text-[10px] tracking-wide ${
                  isActive ? 'text-white' : 'text-white/25'
                }`}
              >
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
