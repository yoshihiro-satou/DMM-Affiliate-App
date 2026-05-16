export function DmmCredit() {
  return (
    <div className="flex items-center justify-end px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-5">
      <a
        href="https://affiliate.dmm.com/api/"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WEB SERVICE BY FANZA"
      >
        {/* 規約で定められた画像クレジット（改変不可） */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://p.dmm.co.jp/p/affiliate/web_service/r18_88_35.gif"
          width={88}
          height={35}
          alt="WEB SERVICE BY FANZA"
          loading="lazy"
        />
      </a>
    </div>
  )
}
