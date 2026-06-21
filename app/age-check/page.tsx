import { Check } from 'lucide-react'
import { confirmAge } from './actions'

type Props = {
  searchParams: Promise<{ from?: string }>
}

export const metadata = {
  title: '年齢確認',
  robots: 'noindex,nofollow',
}

// 安心感を伝える要素（スキャム不安の打ち消し）。登録不要の文言は出さない方針。
const TRUST_POINTS = [
  '無料で楽しめて暇つぶしにも最適',
  '個人情報・クレジットカードの入力なし',
  'FANZA公式アフィリエイト（正規）',
]

export default async function AgeCheckPage({ searchParams }: Props) {
  const { from } = await searchParams

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden">
      {/* 背景グラデーション */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(180,20,20,0.12) 0%, transparent 70%)',
        }}
      />

      {/* ノイズテクスチャ */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
        }}
      />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-7 px-6 py-10">
        {/* ブランド（「正しい場所に来た」と一目で伝える＝離脱の最大要因の解消） */}
        <div className="flex flex-col items-center gap-2 text-center">
          <p className="text-[22px] font-black tracking-tight text-white">FANZAピックス</p>
          <p className="text-[12px] leading-5 text-white/55">
            FANZAの動画を、セール価格・女優・シリーズから探せるまとめサイトです。
          </p>
        </div>

        {/* 年齢確認（法的要件） */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-3">
            <div className="h-px w-8 bg-red-700/70" />
            <span
              className="text-[10px] font-semibold tracking-[0.35em] text-red-600/80"
              style={{ fontFamily: 'ui-monospace, monospace' }}
            >
              AGE VERIFICATION
            </span>
            <div className="h-px w-8 bg-red-700/70" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">年齢確認</h1>
          <p className="text-[13px] leading-6 text-white/65">
            本サービスはアダルトコンテンツを含みます。
            <br />
            18歳以上の方のみご利用いただけます。
          </p>
        </div>

        {/* 安心ポイント */}
        <ul className="flex w-full flex-col gap-2.5">
          {TRUST_POINTS.map((point) => (
            <li key={point} className="flex items-center gap-2.5 text-[12.5px] text-white/70">
              <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                <Check size={11} strokeWidth={3} />
              </span>
              {point}
            </li>
          ))}
        </ul>

        {/* 区切り */}
        <div className="h-px w-full bg-white/8" />

        {/* ボタン */}
        <div className="flex w-full flex-col gap-3">
          {/* 18歳以上 */}
          <form action={confirmAge}>
            <input type="hidden" name="from" value={from ?? '/'} />
            <button
              type="submit"
              className="w-full cursor-pointer rounded-lg bg-white py-4 text-[15px] font-bold tracking-wide text-black transition-opacity duration-150 active:opacity-80"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              18歳以上です・入場する
            </button>
          </form>

          {/* 18歳未満 */}
          <a
            href="https://www.yahoo.co.jp"
            className="block w-full rounded-lg border border-white/12 py-4 text-center text-[15px] font-medium tracking-wide text-white/55 transition-colors duration-150 hover:border-white/20 hover:text-white/70"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            18歳未満です・退場する
          </a>

          {/* 一度きりの確認であることを明示（煩わしさの不安を消す） */}
          <p className="text-center text-[11px] text-white/45">
            確認はこの端末に保存され、次回からは表示されません。
          </p>
        </div>

        {/* 注意文（法的なみなし確認） */}
        <p className="text-center text-[11px] leading-5 text-white/40">
          「入場する」を押すことで、あなたが18歳以上であることを
          <br />
          確認したものとみなします。
        </p>
      </div>
    </main>
  )
}
