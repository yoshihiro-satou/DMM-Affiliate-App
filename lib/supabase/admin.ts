import 'server-only'
import { createServerClient } from '@supabase/ssr'

// サービスロールキーを使いRLSをバイパスするクライアント（サーバー専用）
export function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )
}
