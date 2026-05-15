export default function Loading() {
  return (
    <main className="min-h-dvh bg-[#080808] pb-[calc(4rem+env(safe-area-inset-bottom))]">
      {/* プロフィールスケルトン */}
      <div className="flex gap-4 border-b border-white/8 px-4 py-5">
        <div className="h-28 w-20 shrink-0 animate-pulse rounded-xl bg-white/8" />
        <div className="flex flex-col justify-center gap-2">
          <div className="h-2.5 w-12 animate-pulse rounded bg-white/8" />
          <div className="h-7 w-36 animate-pulse rounded bg-white/8" />
          <div className="h-2.5 w-48 animate-pulse rounded bg-white/8" />
        </div>
      </div>

      {/* タブスケルトン */}
      <div className="flex border-b border-white/8">
        {[1, 2].map((i) => (
          <div key={i} className="flex-1 py-3 flex justify-center">
            <div className="h-3 w-12 animate-pulse rounded bg-white/8" />
          </div>
        ))}
      </div>

      {/* 作品グリッドスケルトン */}
      <div className="grid grid-cols-2 gap-2 grid-flow-dense px-3 pt-3 md:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className={i % 5 === 0 ? 'col-span-2 row-span-2' : 'col-span-1'}>
            <div className="aspect-video w-full animate-pulse rounded-lg bg-white/8" />
          </div>
        ))}
      </div>
    </main>
  )
}
