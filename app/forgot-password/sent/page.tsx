import Link from 'next/link'

export const metadata = {
  title: 'リセットメールを送信しました',
  robots: 'noindex,nofollow',
}

export default function ForgotPasswordSentPage() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden">
      {/* 背景グラデーション */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(180,20,20,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8 px-6 py-12 text-center">
        {/* アイコン */}
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white/60"
          >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </div>

        {/* テキスト */}
        <div className="flex flex-col gap-3">
          <span
            className="text-[10px] font-semibold tracking-[0.35em] text-red-600/80"
            style={{ fontFamily: 'ui-monospace, monospace' }}
          >
            CHECK YOUR EMAIL
          </span>
          <h1
            className="text-3xl font-black tracking-tight text-white"
            
          >
            メールを確認
            <br />
            してください
          </h1>
          <p className="text-[13px] leading-6 text-white/40">
            パスワードリセットリンクを送信しました。
            <br />
            メール内のリンクをタップしてください。
          </p>
        </div>

        <div className="h-px w-full bg-white/8" />

        <p className="text-[11px] leading-5 text-white/20">
          メールが届かない場合は迷惑メールフォルダを
          <br />
          ご確認ください。リンクの有効期限は1時間です。
        </p>

        <Link
          href="/login"
          className="text-[13px] text-white/30 underline underline-offset-4 transition-colors hover:text-white/50"
        >
          ← ログインページに戻る
        </Link>
      </div>
    </main>
  )
}
