import type { Metadata } from 'next'
import { InstallButton } from '@/components/pwa/InstallButton'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://fanzapicks.com'

export const metadata: Metadata = {
  title: 'アプリの使い方（ホーム画面に追加）',
  description:
    'FANZAピックスをiPhone・Androidのホーム画面に追加してアプリのように使う方法。インストール不要で、推し女優の新作通知やセール速報をプッシュ通知で受け取れます。',
  alternates: { canonical: '/pwa' },
  openGraph: {
    title: 'アプリの使い方（ホーム画面に追加） | FANZAピックス',
    description:
      'iPhone・Androidでホーム画面に追加してアプリのように使う方法。インストール不要で通知も受け取れます。',
    url: '/pwa',
  },
}

const FAQ = [
  {
    q: 'FANZAピックスにアプリはありますか？',
    a: 'App Store / Google Play のアプリはありませんが、ブラウザからホーム画面に追加することでアプリのように使えます（PWA）。インストール不要・無料です。',
  },
  {
    q: 'iPhoneでホーム画面に追加するには？',
    a: 'Safariで本サイトを開き、画面下の「共有」ボタンをタップ →「ホーム画面に追加」を選択します。追加後はアイコンから全画面アプリとして起動でき、プッシュ通知も受け取れます。',
  },
  {
    q: 'Androidでホーム画面に追加するには？',
    a: 'Chromeで本サイトを開くと表示される「ホーム画面に追加」または「アプリをインストール」をタップします。メニュー（︙）からも追加できます。',
  },
  {
    q: 'ホーム画面に追加すると何ができますか？',
    a: '推し女優の新作通知、毎日深夜のセール速報、お気に入りの値下げ通知をプッシュ通知で受け取れます。全画面で快適に閲覧でき、起動も速くなります。',
  },
]

export default function PwaGuidePage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  }
  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'ホーム', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'アプリの使い方', item: `${SITE_URL}/pwa` },
    ],
  }

  return (
    <main className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-7 px-6 py-10">
        {/* ヘッダー */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="h-px w-12 bg-red-700" />
          <span
            className="text-[10px] font-semibold tracking-[0.35em] text-red-600/80"
            style={{ fontFamily: 'ui-monospace, monospace' }}
          >
            APP GUIDE
          </span>
          <h1 className="text-2xl font-black tracking-tight text-white">
            アプリの使い方
          </h1>
          <p className="text-[13px] leading-6 text-white/65">
            ホーム画面に追加すると、インストール不要で<br />
            アプリのように使えて通知も受け取れます。
          </p>
        </div>

        {/* インストールCTA */}
        <InstallButton showWhenInstalled />

        {/* iOS 手順 */}
        <section className="rounded-xl border border-white/8 bg-white/3 p-5">
          <h2 className="mb-3 text-[15px] font-bold text-white">iPhone（Safari）の場合</h2>
          <ol className="flex flex-col gap-2 text-[13px] text-white/75">
            <li>① Safariで FANZAピックス を開く</li>
            <li>② 画面下の「共有」ボタン（□に↑）をタップ</li>
            <li>③「ホーム画面に追加」を選ぶ</li>
            <li>④ 追加されたアイコンから起動する</li>
          </ol>
        </section>

        {/* Android 手順 */}
        <section className="rounded-xl border border-white/8 bg-white/3 p-5">
          <h2 className="mb-3 text-[15px] font-bold text-white">Android（Chrome）の場合</h2>
          <ol className="flex flex-col gap-2 text-[13px] text-white/75">
            <li>① Chromeで FANZAピックス を開く</li>
            <li>②「ホーム画面に追加」のバナー、またはメニュー（︙）をタップ</li>
            <li>③「アプリをインストール」または「ホーム画面に追加」を選ぶ</li>
          </ol>
        </section>

        {/* FAQ */}
        <section className="flex flex-col gap-3">
          <h2 className="text-[15px] font-bold text-white">よくある質問</h2>
          {FAQ.map((f) => (
            <div key={f.q} className="rounded-xl border border-white/8 bg-white/3 p-4">
              <p className="text-[14px] font-bold text-white">{f.q}</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-white/65">{f.a}</p>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
