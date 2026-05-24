'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('App error:', error.message, error.digest)
  }, [error])

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4">
      <p className="text-sm text-white/50">{error.message}</p>
      <button
        onClick={reset}
        className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
      >
        再試行
      </button>
    </main>
  )
}
