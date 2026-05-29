import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <div className="text-center">
        <p
          className="text-[48px] font-black leading-none text-white/10"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          404
        </p>
        <p className="mt-2 text-[15px] font-semibold text-white/80">ページが見つかりません</p>
        <p className="mt-1 text-[12px] text-white/40">
          削除されたか、URLが変更された可能性があります
        </p>
      </div>
      <Link
        href="/"
        className="rounded-lg border border-red-700/50 px-5 py-2.5 text-[13px] font-bold text-red-400 hover:border-red-500 hover:text-red-300 active:opacity-70"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        ホームに戻る
      </Link>
    </main>
  )
}
