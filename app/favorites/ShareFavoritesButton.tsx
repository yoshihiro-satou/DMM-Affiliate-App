'use client'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fanzapicks.com'

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}…` : s
}

/**
 * お気に入りTOP3をXでシェア（施策10・バイラル）。
 * ?ref=share を付与し、流入を Phase 0 の計測（funnel_by_ref）で追えるようにする。
 */
export function ShareFavoritesButton({ titles }: { titles: string[] }) {
  const top = titles.filter(Boolean).slice(0, 3)
  if (top.length === 0) return null

  const list = top.map((t, i) => `${i + 1}.「${truncate(t, 24)}」`).join('\n')
  const text = `私のFANZAお気に入り TOP${top.length} 🎯\n${list}\n#FANZAピックス`
  const url = `${SITE_URL}/?ref=share`
  const href = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-1.5 text-[12px] font-bold text-white/60 transition-colors hover:border-white/30 hover:text-white/80 active:opacity-70"
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      𝕏 お気に入りをシェア
    </a>
  )
}
