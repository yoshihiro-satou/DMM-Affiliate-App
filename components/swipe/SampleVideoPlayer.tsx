'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import type { DmmItem } from '@/types/dmm'

type Props = {
  item: DmmItem
  isActive: boolean
}

export function SampleVideoPlayer({ item, isActive }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoUrl =
    item.sampleMovieURL?.size_476_306 ??
    item.sampleMovieURL?.size_560_360 ??
    item.sampleMovieURL?.size_644_414 ??
    item.sampleMovieURL?.size_720_480

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && isActive) {
          video.play().catch(() => {})
        } else {
          video.pause()
        }
      },
      { threshold: 0.5 }
    )
    observer.observe(video)
    return () => observer.disconnect()
  }, [isActive])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (isActive) {
      video.play().catch(() => {})
    } else {
      video.pause()
      video.currentTime = 0
    }
  }, [isActive])

  if (videoUrl) {
    return (
      <video
        ref={videoRef}
        src={videoUrl}
        loop
        muted
        playsInline
        className="h-full w-full object-cover"
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
    <Image
      src={fallbackUrl}
      alt={item.title}
      fill
      className="object-cover"
      sizes="100vw"
    />
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
    <Image
      src={images[idx]}
      alt=""
      fill
      className="object-cover"
      sizes="100vw"
      unoptimized
    />
  )
}
