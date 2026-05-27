'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Compass, Heart, Search, User, LogIn } from 'lucide-react'
import { useAuth } from '@/components/providers/auth-provider'

const NO_NAV_PREFIXES = ['/age-check', '/login', '/auth']

const BASE_TABS = [
  { href: '/', label: 'ホーム', Icon: Home, exact: true },
  { href: '/discover', label: '探す', Icon: Compass, exact: false },
  { href: '/favorites', label: 'お気に入り', Icon: Heart, exact: false },
  { href: '/search', label: '検索', Icon: Search, exact: false },
] as const

export function BottomNav() {
  const pathname = usePathname()
  const { isLoggedIn } = useAuth()

  if (NO_NAV_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return null
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/8 bg-[#0d0d0d]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex h-16 items-stretch">
        {[
          ...BASE_TABS,
          isLoggedIn
            ? { href: '/mypage', label: 'マイページ', Icon: User, exact: false }
            : { href: '/login', label: 'ログイン', Icon: LogIn, exact: false },
        ].map(({ href, label, Icon, exact }) => {
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
              <span className="relative">
                <Icon
                  size={22}
                  strokeWidth={isActive ? 2 : 1.5}
                  className={isActive ? 'text-white' : 'text-white/55'}
                />
                {href === '/favorites' && (
                  <span
                    id="fav-badge"
                    suppressHydrationWarning
                    className="absolute -right-2 -top-1 min-w-[14px] rounded-full bg-red-600 px-[3px] py-px text-center text-[9px] font-bold leading-tight text-white empty:hidden"
                  />
                )}
              </span>
              <span
                className={`text-[10px] tracking-wide ${
                  isActive ? 'text-white' : 'text-white/50'
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
