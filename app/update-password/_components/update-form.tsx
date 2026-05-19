'use client'

import { useActionState } from 'react'
import { updatePassword } from '../actions'

export function UpdateForm() {
  const [state, action, pending] = useActionState(updatePassword, null)

  return (
    <form action={action} className="flex w-full flex-col gap-6">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="password"
          className="text-[11px] font-semibold tracking-[0.2em] text-white/40"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          新しいパスワード
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
        {pending ? '更新中...' : 'パスワードを更新'}
      </button>
    </form>
  )
}
