'use client'

import Link from 'next/link'

type Props = {
  title: string
  body: string
  onClose: () => void
  closeLabel?: string
}

export function LoginPromptSheet({ title, body, onClose, closeLabel = 'あとで' }: Props) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-[#1a1a1a] px-6 pb-10 pt-5">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/20" />
        <h2 className="text-lg font-bold text-white">{title}</h2>
        <p className="mt-2 text-[13px] text-white/70">{body}</p>
        <Link
          href="/login"
          className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-red-600 font-bold text-white"
          onClick={onClose}
        >
          無料で登録する
        </Link>
        <button
          onClick={onClose}
          className="mt-3 flex h-10 w-full items-center justify-center text-[13px] text-white/65"
        >
          {closeLabel}
        </button>
      </div>
    </>
  )
}
