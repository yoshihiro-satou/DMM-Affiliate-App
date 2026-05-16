'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

function ProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [visible, setVisible] = useState(false)
  const [width, setWidth] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hideRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigatingRef = useRef(false)

  function startProgress() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    if (hideRef.current) clearTimeout(hideRef.current)
    navigatingRef.current = true
    setVisible(true)
    setWidth(15)
    intervalRef.current = setInterval(() => {
      setWidth((w) => {
        if (w >= 82) {
          clearInterval(intervalRef.current!)
          return 82
        }
        return w + (82 - w) * 0.08
      })
    }, 120)
  }

  function completeProgress() {
    if (!navigatingRef.current) return
    navigatingRef.current = false
    if (intervalRef.current) clearInterval(intervalRef.current)
    setWidth(100)
    hideRef.current = setTimeout(() => {
      setVisible(false)
      setWidth(0)
    }, 350)
  }

  // リンククリック → 開始
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as Element).closest('a')
      if (
        anchor &&
        anchor.href &&
        !anchor.target &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        anchor.href.startsWith(window.location.origin)
      ) {
        const nextPath = new URL(anchor.href).pathname
        if (nextPath !== pathname) startProgress()
      }
    }
    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // パス変更 → 完了
  useEffect(() => {
    completeProgress()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams])

  if (!visible) return null

  return (
    <div
      role="progressbar"
      aria-hidden
      className="fixed left-0 top-0 z-[9999] h-[2px] bg-red-500 transition-[width] duration-200 ease-out"
      style={{ width: `${width}%` }}
    />
  )
}

// useSearchParams は Suspense が必要
export function NavigationProgress() {
  return (
    <ProgressBar />
  )
}
