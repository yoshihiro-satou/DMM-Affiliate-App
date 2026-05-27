'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signIn } from '../actions'

export function LoginForm({
  initialError,
  initialMessage,
}: {
  initialError?: string
  initialMessage?: string
}) {
  const [state, action, pending] = useActionState(
    signIn,
    initialError ? { error: initialError } : null
  )

  return (
    <form action={action} className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="email"
          className="text-[11px] font-semibold tracking-[0.2em] text-white/65"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          メールアドレス
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="例：you@example.com"
          className="border-b border-white/15 bg-transparent pb-3 pt-1 text-[15px] text-white placeholder-white/20 outline-none transition-colors focus:border-red-700/60"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="password"
          className="text-[11px] font-semibold tracking-[0.2em] text-white/65"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          パスワード
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="パスワード"
          className="border-b border-white/15 bg-transparent pb-3 pt-1 text-[15px] text-white placeholder-white/20 outline-none transition-colors focus:border-red-700/60"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        />
      </div>

      {initialMessage && (
        <p className="text-[12px] leading-5 text-emerald-400/90">{initialMessage}</p>
      )}

      {state?.error && (
        <p className="text-[12px] text-red-400/80">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-full rounded-lg bg-white py-4 text-[15px] font-bold tracking-wide text-black transition-opacity duration-150 active:opacity-80 disabled:opacity-40"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        {pending ? 'ログイン中...' : 'ログイン'}
      </button>

      <div className="flex flex-col items-center gap-3 text-center">
        <Link
          href="/forgot-password"
          className="text-[11px] text-white/65 underline underline-offset-2 transition-colors active:text-white/70"
        >
          パスワードを忘れた方はこちら
        </Link>
        <Link
          href="/register"
          className="text-[13px] font-semibold text-white/60 underline underline-offset-4 transition-colors active:text-white/90"
        >
          はじめての方は新規登録 →
        </Link>
      </div>
    </form>
  )
}
