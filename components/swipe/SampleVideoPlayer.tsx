'use client'

import Image from 'next/image'
import { useState, useEffect } from 'react'
import type { DmmItem } from '@/types/dmm'

type Props = {
  item: DmmItem
  isActive: boolean
}

function pickPlayerUrl(urls: NonNullable<DmmItem['sampleMovieURL']>): string | undefined {
  const w = window.innerWidth
  if (w <= 476) return urls.size_476_306 ?? urls.size_560_360 ?? urls.size_644_414 ?? urls.size_720_480
  if (w <= 560) return urls.size_560_360 ?? urls.size_644_414 ?? urls.size_720_480 ?? urls.size_476_306
  if (w <= 644) return urls.size_644_414 ?? urls.size_720_480 ?? urls.size_560_360 ?? urls.size_476_306
  return urls.size_720_480 ?? urls.size_644_414 ?? urls.size_560_360 ?? urls.size_476_306
}

// playerUrl に含まれる size=W_H からアスペクト比を取得
function parseUrlSize(playerUrl: string): { w: number; h: number } {
  const m = playerUrl.match(/size=(\d+)_(\d+)/)
  return m ? { w: Number(m[1]), h: Number(m[2]) } : { w: 4, h: 3 }
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
    return (
      <iframe
        key={item.content_id + '-iframe'}
        src={playerUrl}
        className="w-full border-0"
        style={{ aspectRatio: `${w}/${h}` }}
        allow="autoplay; fullscreen"
      />
    )
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
