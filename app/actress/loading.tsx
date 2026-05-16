export default function Loading() {
  return (
    <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <div className="border-b border-white/8 px-4 py-4">
        <div className="h-2.5 w-16 animate-pulse rounded bg-white/8" />
        <div className="mt-2 h-7 w-32 animate-pulse rounded bg-white/8" />
      </div>
      <div className="grid grid-cols-2 gap-3 px-3 pt-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="aspect-[3/4] w-full animate-pulse rounded-xl bg-white/8" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-white/8" />
            <div className="h-2.5 w-1/2 animate-pulse rounded bg-white/8" />
          </div>
        ))}
      </div>
    </main>
  )
}
