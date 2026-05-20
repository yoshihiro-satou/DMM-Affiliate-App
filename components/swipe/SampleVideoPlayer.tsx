'use client'

import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import type { DmmItem } from '@/types/dmm'

type Props = {
  item: DmmItem
  isActive: boolean
}

function pickPlayerUrl(urls: NonNullable<DmmItem['sampleMovieURL']>): string | undefined {
  // 最高画質を固定で取得し、CSS (w-full) でカード幅に縮小表示
  return urls.size_720_480 ?? urls.size_644_414 ?? urls.size_560_360 ?? urls.size_476_306
}

// playerUrl に含まれる size=W_H からアスペクト比を取得
function parseUrlSize(playerUrl: string): { w: number; h: number } {
  const m = playerUrl.match(/size=(\d+)_(\d+)/)
  return m ? { w: Number(m[1]), h: Number(m[2]) } : { w: 4, h: 3 }
}

function injectAffiliateId(playerUrl: string, affiliateUrl: string | undefined): string {
  const afId = affiliateUrl?.match(/af_id=([^&]+)/)?.[1]
  if (!afId) return playerUrl
  if (/affi_id=/.test(playerUrl)) {
    return playerUrl.replace(/affi_id=[^/&]+/, `affi_id=${afId}`)
  }
  const sep = playerUrl.endsWith('/') ? '' : '/'
  return `${playerUrl}${sep}affi_id=${afId}/`
}

function toDirectMp4(playerUrl: string): string | undefined {
  const cid = playerUrl.match(/cid=([^/]+)/)?.[1]
  const size = playerUrl.match(/size=(\d+)_(\d+)/)
  if (!cid || !size) return undefined
  const c1 = cid[0]
  const c3 = cid.slice(0, 3)
  const [, w, h] = size
  return `https://cc3001.dmm.co.jp/litevideo/freepv/${c1}/${c3}/${cid}/${cid}_sm_w${w}h${h}.mp4`
}

export function SampleVideoPlayer({ item, isActive }: Props) {
  const [useFallbackIframe, setUseFallbackIframe] = useState(false)

  const playerUrl = isActive && item.sampleMovieURL
    ? pickPlayerUrl(item.sampleMovieURL)
    : undefined

  const directMp4 = playerUrl ? toDirectMp4(playerUrl) : undefined

  useEffect(() => { setUseFallbackIframe(false) }, [item.content_id])

  if (directMp4 && !useFallbackIframe) {
    const { w, h } = parseUrlSize(playerUrl!)
    return (
      <video
        key={item.content_id}
        src={directMp4}
        autoPlay
        muted
        playsInline
        controls
        className="w-full bg-black"
        style={{ aspectRatio: `${w}/${h}` }}
        onError={() => setUseFallbackIframe(true)}
      />
    )
  }

  if (playerUrl) {
    const { w, h } = parseUrlSize(playerUrl)
    const src = injectAffiliateId(playerUrl, item.affiliateURL)
    return <ScaledIframe key={item.content_id + '-iframe'} src={src} w={w} h={h} />
  }

  const images =
    item.sampleImageURL?.sample_l?.image ??
    item.sampleImageURL?.sample_s?.image ??
    []
  if (images.length > 0) {
    return <ImageSlideshow images={images} isActive={isActive} />
  }

  const fallbackUrl = item.imageURL.large ?? item.imageURL.list ?? item.imageURL.small
  if (!fallbackUrl) return null
  return (
    <div className="relative w-full aspect-[3/2]">
      <Image
        src={fallbackUrl}
        alt={item.title}
        fill
        className="object-cover"
        sizes="100vw"
      />
    </div>
  )
}

function ScaledIframe({ src, w, h }: { src: string; w: number; h: number }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setScale(el.clientWidth / w)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [w])

  return (
    <div ref={containerRef} className="w-full overflow-hidden" style={{ height: h * scale }}>
      <iframe
        src={src}
        width={w}
        height={h}
        className="border-0"
        style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
        allow="autoplay; fullscreen"
      />
    </div>
  )
}

function ImageSlideshow({ images, isActive }: { images: string[]; isActive: boolean }) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (!isActive || images.length <= 1) return
    const id = setInterval(() => setIdx((i) => (i + 1) % images.length), 2000)
    return () => clearInterval(id)
  }, [isActive, images.length])

  return (
    <div className="relative w-full aspect-[3/2]">
      <Image
        src={images[idx]}
        alt=""
        fill
        className="object-cover"
        sizes="100vw"
        unoptimized
      />
    </div>
  )
}
