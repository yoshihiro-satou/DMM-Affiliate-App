export function PageSpinner({ label = '読み込み中...' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <div className="relative h-11 w-11">
        <div className="absolute inset-0 rounded-full border-2 border-white/10" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-red-500" />
      </div>
      <span className="text-[11px] tracking-widest text-white/55">{label}</span>
    </div>
  )
}
