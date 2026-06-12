import { notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'
import { buildXPosts, type XPost, type XPostSegment } from '@/lib/social/x-post-generator'
import { CopyButton } from '@/components/admin/CopyButton'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'X 投稿ジェネレータ',
  robots: 'noindex,nofollow',
}

function ImageGrid({ images }: { images: string[] }) {
  if (images.length === 0) return null
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-[11px] text-white/45">
        添付候補（その都度選択・タップで原寸を開いて保存） · {images.length}枚
      </p>
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {images.map((src, i) => (
          <a
            key={src}
            href={src}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative block overflow-hidden rounded-md border border-white/10 bg-black/30"
            title={i === 0 ? 'パッケージ' : `サンプル ${i}`}
          >
            {/* 管理用ツールのため next/image ではなく素の img（無改変表示・DMM規約遵守） */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={i === 0 ? 'パッケージ画像' : `サンプル画像 ${i}`}
              loading="lazy"
              className="aspect-[3/2] w-full object-cover transition-opacity group-hover:opacity-80"
            />
            {i === 0 ? (
              <span className="absolute left-1 top-1 rounded bg-black/70 px-1 text-[9px] font-bold text-white/85">
                パッケージ
              </span>
            ) : null}
          </a>
        ))}
      </div>
    </div>
  )
}

function SegmentBlock({ seg, index }: { seg: XPostSegment; index: number }) {
  const over = seg.weight > 280
  return (
    <div className="rounded-lg border border-white/8 bg-black/20 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-sky-300/80">{seg.label}</span>
        <span className={`text-[11px] tabular-nums ${over ? 'text-red-400' : 'text-white/40'}`}>
          {seg.weight}/280
        </span>
      </div>
      <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-white/85">
        {seg.text}
      </pre>
      <div className="mt-3">
        <CopyButton text={seg.text} label={`${index + 1}ツイート目をコピー`} />
      </div>
      {seg.movieUrl ? (
        <p className="mt-2 text-[11px] leading-relaxed text-white/55">
          🎬 サンプル動画:{' '}
          <a
            href={seg.movieUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-300/80 underline underline-offset-2 break-all"
          >
            開いてDL → 動画として添付
          </a>
        </p>
      ) : null}
      <ImageGrid images={seg.images} />
    </div>
  )
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
        {post.thread ? (
          <span className="text-[11px] tabular-nums text-white/40">{post.thread.length}連投</span>
        ) : (
          <span className={`text-[11px] tabular-nums ${over ? 'text-red-400' : 'text-white/40'}`}>
            {post.weight}/280
          </span>
        )}
      </div>

      {post.thread ? (
        <div className="flex flex-col gap-2.5">
          <p className="text-[11px] leading-relaxed text-amber-300/70">
            ①を投稿 → そのツイートに②をリプライで連投。リンクは②に逃がしてフックのリーチを最大化。
          </p>
          {post.thread.map((seg, i) => (
            <SegmentBlock key={seg.label} seg={seg} index={i} />
          ))}
        </div>
      ) : (
        <>
          <pre className="whitespace-pre-wrap break-words font-sans text-[13px] leading-relaxed text-white/85">
            {post.text}
          </pre>
          <div className="mt-3">
            <CopyButton text={post.text} label="投稿文をコピー" />
          </div>
          {post.images.length > 0 ? (
            <ImageGrid images={post.images} />
          ) : (
            <p className="mt-3 text-[11px] text-white/40">画像なし（テキスト投稿）</p>
          )}
        </>
      )}

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
            今日のセール・新作から「拡散の科学」準拠の投稿案を生成。①フックを投稿 → そのツイートに②を
            リプライ連投。②の CTA は全アングル{' '}
            <code className="text-white/60">Telegram（t.me/s/）</code>{' '}
            へ一本化＝X→フォロー獲得で外部購読者0→1を狙う（Template A）。
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-sky-300/70">
            ⏰ 投稿の狙い目: アダルト系Xは <strong>夜21時〜深夜2時</strong>{' '}
            が最も伸びやすい（帰宅後〜就寝前）。昼12時台も小ピーク。
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-amber-300/70">
            ※ 画像はDMM公式パッケージを無改変で添付（規約）。センシティブメディア設定の上で投稿してください。
            同一作品の72時間以内の再投稿は避ける。②ツイートには景表法対応の「PR」表記を入れ込み済み。
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
