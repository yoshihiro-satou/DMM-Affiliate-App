'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { runGuestMigration } from '@/lib/guest-migration'

export function AuthListener() {
  const supabase = createClient()

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN') {
        await runGuestMigration()
      }
    })
    return () => subscription.unsubscribe()
  }, [supabase.auth])

  return null
}
