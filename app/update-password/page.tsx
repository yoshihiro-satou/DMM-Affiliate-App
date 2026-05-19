import { UpdateForm } from './_components/update-form'

export const metadata = {
  title: '新しいパスワードを設定',
  robots: 'noindex,nofollow',
}

export default function UpdatePasswordPage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden">
      {/* 背景グラデーション */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(180,20,20,0.10) 0%, transparent 70%)',
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
            NEW PASSWORD
          </span>
        </div>

        {/* タイトル */}
        <div className="flex flex-col items-center gap-3 text-center">
          <h1
            className="text-4xl font-black tracking-tight text-white"
            
          >
            パスワードを設定
          </h1>
          <p className="text-[13px] leading-6 text-white/40">
            新しいパスワードを入力してください。
          </p>
        </div>

        {/* 区切り */}
        <div className="h-px w-full bg-white/8" />

        {/* フォーム */}
        <UpdateForm />
      </div>
    </main>
  )
}
