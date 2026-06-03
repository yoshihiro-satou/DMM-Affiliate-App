import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'KPI ダッシュボード',
  robots: 'noindex,nofollow',
}

// ── 型 ───────────────────────────────────────────────────────────────────────

type FunnelDay = {
  day: string
  visits: number
  unique_visitors: number
  age_pass: number
  pwa_install: number
  notify_grant: number
  affiliate_clicks: number
  affiliate_click_sessions: number
}

type FunnelRef = {
  ref: string | null
  visitors: number
  notify_grant: number
  affiliate_clicks: number
}

// 通知種別（notification_queue.type） → 計測 ref（push_*）の対応（追加18）
const NOTIFY_CHANNELS: Array<{ label: string; queueType: string; ref: string }> = [
  { label: 'セール速報', queueType: 'sale_broadcast', ref: 'push_sale' },
  { label: '推し新作', queueType: 'oshi_daily_deal', ref: 'push_oshi' },
  { label: 'バッジ間近', queueType: 'badge', ref: 'push_badge' },
]

// ── データ取得 ────────────────────────────────────────────────────────────────

async function loadData() {
  const admin = createAdminClient()

  const [daily, byRef, queue] = await Promise.all([
    admin
      .from('funnel_daily')
      .select('*')
      .order('day', { ascending: false })
      .limit(14),
    admin
      .from('funnel_by_ref')
      .select('*')
      .order('visitors', { ascending: false })
      .limit(30),
    admin
      .from('notification_queue')
      .select('type, status')
      .gte('created_at', new Date(Date.now() - 30 * 86_400_000).toISOString()),
  ])

  // 通知キューを type × status で集計
  const queueByType = new Map<string, { total: number; sent: number }>()
  for (const row of (queue.data ?? []) as Array<{ type: string; status: string }>) {
    const cur = queueByType.get(row.type) ?? { total: 0, sent: 0 }
    cur.total++
    if (row.status === 'sent') cur.sent++
    queueByType.set(row.type, cur)
  }

  return {
    daily: (daily.data ?? []) as FunnelDay[],
    byRef: (byRef.data ?? []) as FunnelRef[],
    queueByType,
  }
}

// ── 表示ヘルパー ──────────────────────────────────────────────────────────────

function pct(num: number, den: number): string {
  if (!den) return '—'
  return `${Math.round((num / den) * 1000) / 10}%`
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={`whitespace-nowrap px-3 py-2 text-[11px] font-semibold tracking-wide text-white/55 ${
        right ? 'text-right tabular-nums' : 'text-left'
      }`}
    >
      {children}
    </th>
  )
}

function Td({ children, right, dim }: { children: React.ReactNode; right?: boolean; dim?: boolean }) {
  return (
    <td
      className={`whitespace-nowrap px-3 py-2 text-[12px] ${right ? 'text-right tabular-nums' : 'text-left'} ${
        dim ? 'text-white/45' : 'text-white/75'
      }`}
    >
      {children}
    </td>
  )
}

// ── ページ ────────────────────────────────────────────────────────────────────

export default async function KpiDashboard() {
  const claims = await getCurrentUser()
  const adminEmail = process.env.ADMIN_EMAIL
  const email = (claims?.email as string | undefined) ?? null

  // ADMIN_EMAIL 未設定・非一致は存在自体を伏せる（noindex に加えた二重ガード）
  if (!adminEmail || !email || email.toLowerCase() !== adminEmail.toLowerCase()) {
    notFound()
  }

  const { daily, byRef, queueByType } = await loadData()

  return (
    <main className="min-h-dvh px-4 py-8 pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-6">
          <span
            className="text-[10px] font-semibold tracking-[0.35em] text-red-600/80"
            style={{ fontFamily: 'ui-monospace, monospace' }}
          >
            ADMIN · KPI
          </span>
          <h1 className="mt-1 text-xl font-black text-white">ファネル ダッシュボード</h1>
          <p className="mt-1 text-[12px] text-white/45">
            自前計測（追加12）の funnel_daily / funnel_by_ref を表示。GA4 非依存・自分のみ閲覧。
          </p>
        </header>

        {/* 日次ファネル */}
        <section className="mb-8">
          <h2 className="mb-2 text-[13px] font-bold text-white/80">日次ファネル（直近14日）</h2>
          <div className="overflow-x-auto rounded-lg border border-white/8 bg-white/3">
            <table className="w-full border-collapse">
              <thead className="border-b border-white/8">
                <tr>
                  <Th>日付</Th>
                  <Th right>訪問</Th>
                  <Th right>UU</Th>
                  <Th right>Age通過</Th>
                  <Th right>PWA</Th>
                  <Th right>通知許可</Th>
                  <Th right>クリック</Th>
                  <Th right>CV率</Th>
                </tr>
              </thead>
              <tbody>
                {daily.length === 0 ? (
                  <tr>
                    <Td dim>データなし</Td>
                  </tr>
                ) : (
                  daily.map((d) => (
                    <tr key={d.day} className="border-b border-white/5 last:border-0">
                      <Td>{d.day}</Td>
                      <Td right>{d.visits}</Td>
                      <Td right>{d.unique_visitors}</Td>
                      <Td right>{d.age_pass}</Td>
                      <Td right>{d.pwa_install}</Td>
                      <Td right>{d.notify_grant}</Td>
                      <Td right>{d.affiliate_click_sessions}</Td>
                      <Td right dim>
                        {pct(d.affiliate_click_sessions, d.unique_visitors)}
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-[10px] text-white/35">
            CV率 = アフィリンククリックした訪問者 ÷ UU。
          </p>
        </section>

        {/* 通知効果（追加18） */}
        <section className="mb-8">
          <h2 className="mb-2 text-[13px] font-bold text-white/80">通知 → クリック（直近30日）</h2>
          <div className="overflow-x-auto rounded-lg border border-white/8 bg-white/3">
            <table className="w-full border-collapse">
              <thead className="border-b border-white/8">
                <tr>
                  <Th>通知種別</Th>
                  <Th right>送信（sent）</Th>
                  <Th right>キュー計</Th>
                  <Th right>流入</Th>
                  <Th right>クリック</Th>
                  <Th right>クリック率</Th>
                </tr>
              </thead>
              <tbody>
                {NOTIFY_CHANNELS.map((ch) => {
                  const q = queueByType.get(ch.queueType) ?? { total: 0, sent: 0 }
                  const r = byRef.find((x) => x.ref === ch.ref)
                  const visitors = r?.visitors ?? 0
                  const clicks = r?.affiliate_clicks ?? 0
                  return (
                    <tr key={ch.queueType} className="border-b border-white/5 last:border-0">
                      <Td>
                        {ch.label}
                        <span className="ml-1.5 text-[10px] text-white/35">{ch.ref}</span>
                      </Td>
                      <Td right>{q.sent}</Td>
                      <Td right dim>
                        {q.total}
                      </Td>
                      <Td right>{visitors}</Td>
                      <Td right>{clicks}</Td>
                      <Td right dim>
                        {pct(clicks, visitors)}
                      </Td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-1.5 text-[10px] text-white/35">
            流入・クリックは通知URLの ?ref=push_* を funnel_by_ref で集計（追加18）。送信は
            notification_queue（status=sent）。
          </p>
        </section>

        {/* 流入元別 */}
        <section className="mb-8">
          <h2 className="mb-2 text-[13px] font-bold text-white/80">流入元別（全期間・上位30）</h2>
          <div className="overflow-x-auto rounded-lg border border-white/8 bg-white/3">
            <table className="w-full border-collapse">
              <thead className="border-b border-white/8">
                <tr>
                  <Th>ref</Th>
                  <Th right>訪問者</Th>
                  <Th right>通知許可</Th>
                  <Th right>クリック</Th>
                  <Th right>CV率</Th>
                </tr>
              </thead>
              <tbody>
                {byRef.length === 0 ? (
                  <tr>
                    <Td dim>データなし</Td>
                  </tr>
                ) : (
                  byRef.map((r, i) => (
                    <tr key={`${r.ref ?? 'direct'}-${i}`} className="border-b border-white/5 last:border-0">
                      <Td>{r.ref ?? <span className="text-white/40">（直接・なし）</span>}</Td>
                      <Td right>{r.visitors}</Td>
                      <Td right>{r.notify_grant}</Td>
                      <Td right>{r.affiliate_clicks}</Td>
                      <Td right dim>
                        {pct(r.affiliate_clicks, r.visitors)}
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </main>
  )
}
