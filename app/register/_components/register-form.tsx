'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { signUp } from '../actions'

export function RegisterForm() {
  const [state, action, pending] = useActionState(signUp, null)

  return (
    <form action={action} className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="display_name"
          className="text-[11px] font-semibold tracking-[0.2em] text-white/40"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          ニックネーム
        </label>
        <input
          id="display_name"
          name="display_name"
          type="text"
          required
          autoComplete="nickname"
          placeholder="例：さとうくん"
          className="border-b border-white/15 bg-transparent pb-3 pt-1 text-[15px] text-white placeholder-white/20 outline-none transition-colors focus:border-red-700/60"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="email"
          className="text-[11px] font-semibold tracking-[0.2em] text-white/40"
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
          className="text-[11px] font-semibold tracking-[0.2em] text-white/40"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          パスワード
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="8文字以上"
          className="border-b border-white/15 bg-transparent pb-3 pt-1 text-[15px] text-white placeholder-white/20 outline-none transition-colors focus:border-red-700/60"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="confirm_password"
          className="text-[11px] font-semibold tracking-[0.2em] text-white/40"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          パスワード確認
        </label>
        <input
          id="confirm_password"
          name="confirm_password"
          type="password"
          required
          autoComplete="new-password"
          placeholder="もう一度入力"
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
        {pending ? '作成中...' : 'アカウントを作成'}
      </button>

      <p className="text-center text-[11px] leading-5 text-white/20">
        登録後に確認メールを送信します。
        <br />
        メールのリンクをタップするとログインが完了します。
      </p>

      <div className="text-center">
        <Link
          href="/login"
          className="text-[11px] text-white/30 underline underline-offset-2"
        >
          すでにアカウントをお持ちの方はこちら
        </Link>
      </div>
    </form>
  )
}
