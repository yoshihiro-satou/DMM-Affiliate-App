'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { resetPassword } from '../actions'

export function ForgotForm() {
  const [state, action, pending] = useActionState(resetPassword, null)

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
          placeholder="登録済みのメールアドレス"
          className="border-b border-white/15 bg-transparent pb-3 pt-1 text-[15px] text-white placeholder-white/20 outline-none transition-colors focus:border-red-700/60"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        />
      </div>

      {state?.error && (
        <p className="text-[12px] text-red-400/80">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 w-full rounded-lg bg-white py-4 text-[15px] font-bold tracking-wide text-black transition-opacity duration-150 active:opacity-80 disabled:opacity-40"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        {pending ? '送信中...' : 'リセットメールを送信'}
      </button>

      <p className="text-center text-[11px] leading-5 text-white/40">
        登録済みのメールアドレスにリセットリンクを送信します。
        <br />
        リンクの有効期限は1時間です。
      </p>

      <div className="text-center">
        <Link
          href="/login"
          className="text-[11px] text-white/55 underline underline-offset-2"
        >
          ログインページに戻る
        </Link>
      </div>
    </form>
  )
}
