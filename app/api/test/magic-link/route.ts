/**
 * テスト専用エンドポイント（本番環境では 404 を返す）
 *
 * POST  /api/test/magic-link  – マジックリンクトークンを生成（メール送信なし）
 * GET   /api/test/magic-link  – ユーザーの login_streak / user_badges を取得
 * DELETE /api/test/magic-link – テストユーザーを削除
 */
import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

function notFound() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}

// POST: admin.generateLink でトークン生成（メール未送信）
export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') return notFound()

  const { email, display_name } = (await request.json()) as {
    email: string
    display_name: string
  }

  if (!email || !display_name) {
    return NextResponse.json({ error: 'email and display_name required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
    options: { data: { display_name } },
  })

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'generateLink failed' }, { status: 400 })
  }

  return NextResponse.json({
    token_hash: data.properties.hashed_token,
    user_id: data.user.id,
    email: data.user.email,
  })
}

// GET: DBのログインストリーク・バッジ取得（テスト検証用）
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') return notFound()

  const user_id = request.nextUrl.searchParams.get('user_id')
  if (!user_id) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  }

  const admin = createAdminClient()

  const [streakRes, badgesRes] = await Promise.all([
    admin
      .from('login_streaks')
      .select('current_streak, last_login_date')
      .eq('user_id', user_id)
      .maybeSingle(),
    admin
      .from('user_badges')
      .select('badge_type')
      .eq('user_id', user_id),
  ])

  return NextResponse.json({
    login_streak: streakRes.data?.current_streak ?? null,
    last_login_date: streakRes.data?.last_login_date ?? null,
    badges: (badgesRes.data ?? []).map((b: { badge_type: string }) => b.badge_type),
  })
}

// PUT: パスワード確認済みユーザーを作成（OTP不使用）
export async function PUT(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') return notFound()

  const { email, display_name, password } = (await request.json()) as {
    email: string
    display_name: string
    password: string
  }

  if (!email || !display_name || !password) {
    return NextResponse.json(
      { error: 'email, display_name, password required' },
      { status: 400 }
    )
  }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name },
  })

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'createUser failed' }, { status: 400 })
  }

  return NextResponse.json({ user_id: data.user.id, email: data.user.email })
}

// DELETE: テストユーザーを削除
export async function DELETE(request: NextRequest) {
  if (process.env.NODE_ENV === 'production') return notFound()

  const { user_id } = (await request.json()) as { user_id: string }
  if (!user_id) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.auth.admin.deleteUser(user_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
