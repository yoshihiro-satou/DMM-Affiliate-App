export default function FavoritesLoading() {
  return (
    <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <div className="border-b border-white/8 px-4 py-4">
        <div className="h-7 w-24 animate-pulse rounded bg-white/10" />
        <div className="mt-1.5 h-3 w-10 animate-pulse rounded bg-white/5" />
      </div>
      <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3 md:grid-cols-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <div className="aspect-[184/250] w-full animate-pulse rounded-lg bg-white/5" />
            <div className="h-3 w-full animate-pulse rounded bg-white/5" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-white/5" />
          </div>
        ))}
      </div>
    </main>
  )
}
