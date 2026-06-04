import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import { buildXPosts, type XPost } from '@/lib/social/x-post-generator'
import { CopyButton } from '@/components/admin/CopyButton'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'X 投稿ジェネレータ',
  robots: 'noindex,nofollow',
}

function PostCard({ post }: { post: XPost }) {
  const over = post.weight > 280
  return (
    <article className="rounded-xl border border-white/10 bg-white/3 p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span
          className="text-[10px] font-semibold tracking-[0.2em] text-emerald-400/80"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          {post.angleLabel}
        </span>
        <span className={`text-[11px] tabular-nums ${over ? 'text-red-400' : 'text-white/40'}`}>
          {post.weight}/280
        </span>
      </div>

      <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-white/85">
        {post.text}
      </pre>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <CopyButton text={post.text} label="投稿文をコピー" />
        {post.imageUrl ? (
          <a
            href={post.imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-[12px] font-bold text-white/75 transition-colors hover:border-white/30"
          >
            添付画像を開く
          </a>
        ) : (
          <span className="text-[11px] text-white/40">画像なし（テキスト投稿）</span>
        )}
      </div>

      {post.itemTitle ? (
        <p className="mt-2 truncate text-[10px] text-white/35">元作品: {post.itemTitle}</p>
      ) : null}
    </article>
  )
}

export default async function XPostsPage() {
  const claims = await getCurrentUser()
  const adminEmail = process.env.ADMIN_EMAIL
  const email = (claims?.email as string | undefined) ?? null

  // ADMIN_EMAIL 未設定・非一致は存在自体を伏せる（noindex に加えた二重ガード）
  if (!adminEmail || !email || email.toLowerCase() !== adminEmail.toLowerCase()) {
    notFound()
  }

  const posts = await buildXPosts()

  return (
    <main className="min-h-dvh px-4 py-8 pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-6">
          <span
            className="text-[10px] font-semibold tracking-[0.35em] text-red-600/80"
            style={{ fontFamily: 'ui-monospace, monospace' }}
          >
            ADMIN · X POSTS
          </span>
          <h1 className="mt-1 text-xl font-black text-white">X 投稿ジェネレータ</h1>
          <p className="mt-1 text-[12px] leading-relaxed text-white/45">
            今日のセール・新作から「拡散の科学」準拠の投稿案を生成。コピー → Xに貼り付け →
            画像を添付して投稿。リンクは <code className="text-white/60">?ref=x</code> 付きで流入を計測。
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-amber-300/70">
            ※ 画像はDMM公式パッケージを無改変で添付（規約）。センシティブメディア設定の上で投稿してください。
            同一作品の72時間以内の再投稿は避ける。
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="py-16 text-center text-[13px] text-white/55">
            本日の投稿候補がありません（割引10%以上のセールが無い等）。時間をおいて再読み込みしてください。
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {posts.map((post) => (
              <PostCard key={post.angle} post={post} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
