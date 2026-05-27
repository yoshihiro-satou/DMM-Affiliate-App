'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { BADGE_DEFS, type BadgeType } from '@/lib/badges'

type Props = {
  badges: BadgeType[]
  onDismiss: () => void
}

export function BadgeToast({ badges, onDismiss }: Props) {
  useEffect(() => {
    if (badges.length === 0) return
    const t = setTimeout(onDismiss, 3000)
    return () => clearTimeout(t)
  }, [badges, onDismiss])

  return (
    <AnimatePresence>
      {badges.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ type: 'spring', stiffness: 400, damping: 28 }}
          className="fixed left-1/2 top-4 z-[200] -translate-x-1/2"
        >
          <div className="flex flex-col gap-2">
            {badges.map((badge) => {
              const def = BADGE_DEFS[badge]
              return (
                <div
                  key={badge}
                  className="flex items-center gap-3 rounded-2xl border border-yellow-500/30 bg-black/90 px-4 py-3 shadow-xl backdrop-blur-md"
                >
                  <span className="text-2xl leading-none">{def.emoji}</span>
                  <div className="flex flex-col">
                    <span
                      className="text-[9px] font-bold tracking-[0.2em] text-yellow-500"
                      style={{ fontFamily: 'ui-monospace, monospace' }}
                    >
                      BADGE UNLOCKED
                    </span>
                    <span className="text-[14px] font-black text-white">{def.label}</span>
                    <span className="text-[10px] text-white/65">{def.description}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
