import { BADGE_DEFS, type BadgeProgress } from '@/lib/badge-progress'

/** 「あと◯」の単位（バッジ種別ごと）。 */
function remainLabel(type: BadgeProgress['type'], remain: number): string {
  if (type.startsWith('STREAK')) return `あと${remain}日`
  if (type.startsWith('COLLECTOR')) return `あと${remain}件`
  if (type === 'REACTOR_10') return `あと${remain}回`
  return `あと${remain}`
}

export function BadgeShowcase({ badges }: { badges: BadgeProgress[] }) {
  const earnedCount = badges.filter((b) => b.earned).length

  return (
    <div className="rounded-lg border border-white/8 bg-white/3 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p
          className="text-[10px] font-semibold tracking-[0.2em] text-white/55"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          バッジコレクション
        </p>
        <span className="text-[11px] tabular-nums text-white/45">
          {earnedCount} / {badges.length}
        </span>
      </div>

      <ul className="flex flex-col gap-2.5">
        {badges.map((b) => {
          const def = BADGE_DEFS[b.type]
          const remain = Math.max(b.target - b.current, 0)
          const pct = Math.round((b.current / b.target) * 100)
          return (
            <li key={b.type} className="flex items-center gap-3">
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-lg ${
                  b.earned ? 'bg-yellow-500/15' : 'bg-white/5 grayscale'
                }`}
                style={{ opacity: b.earned ? 1 : 0.5 }}
              >
                {def.emoji}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`truncate text-[13px] font-bold ${
                      b.earned ? 'text-white' : 'text-white/55'
                    }`}
                  >
                    {def.label}
                  </span>
                  {b.earned ? (
                    <span className="shrink-0 text-[10px] font-bold tracking-wider text-yellow-500">
                      獲得済
                    </span>
                  ) : (
                    <span className="shrink-0 text-[10px] tabular-nums text-white/45">
                      {remainLabel(b.type, remain)}
                    </span>
                  )}
                </div>

                {b.earned ? (
                  <p className="truncate text-[10px] text-white/45">{def.description}</p>
                ) : (
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
                    <div
                      className="h-full rounded-full bg-red-600/60"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
