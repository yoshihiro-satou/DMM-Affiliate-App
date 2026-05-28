'use client'

import { useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { runGuestMigration } from '@/lib/guest-migration'
import { setGaUserId } from '@/lib/analytics'

export function AuthListener() {
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN') {
        await runGuestMigration()
        setGaUserId(session?.user?.id ?? null)
      }
      if (event === 'SIGNED_OUT') {
        setGaUserId(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase])

  return null
}
