import { confirmAge } from './actions'

type Props = {
  searchParams: Promise<{ from?: string }>
}

export const metadata = {
  title: '年齢確認',
  robots: 'noindex,nofollow',
}

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

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-10 px-6 py-12">
        {/* 上部アクセント */}
        <div className="flex flex-col items-center gap-4">
          <div className="h-px w-12 bg-red-700" />
          <span
            className="text-[10px] font-semibold tracking-[0.35em] text-red-600/80"
            style={{ fontFamily: 'ui-monospace, monospace' }}
          >
            AGE VERIFICATION
          </span>
        </div>

        {/* メインコピー */}
        <div className="flex flex-col items-center gap-5 text-center">
          <h1
            className="text-4xl font-black tracking-tight text-white"
            style={{ fontFamily: '"Hiragino Mincho ProN", "Yu Mincho", Georgia, serif' }}
          >
            年齢確認
          </h1>
          <p className="text-[13px] leading-6 text-white/40">
            本サービスはアダルトコンテンツを含みます。
            <br />
            18歳以上の方のみご利用いただけます。
          </p>
        </div>

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
            className="block w-full rounded-lg border border-white/12 py-4 text-center text-[15px] font-medium tracking-wide text-white/30 transition-colors duration-150 hover:border-white/20 hover:text-white/50"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            18歳未満です・退場する
          </a>
        </div>

        {/* 注意文 */}
        <p className="text-center text-[11px] leading-5 text-white/20">
          「入場する」を押すことで、あなたが18歳以上であることを
          <br />
          確認したものとみなします。
        </p>
      </div>
    </main>
  )
}
