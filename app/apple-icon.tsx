import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#e9d5ff',
        borderRadius: '50%',
      }}
    >
      {/* 縦バー */}
      <div style={{
        position: 'absolute',
        left: 40,
        top: 30,
        width: 25,
        height: 120,
        background: '#4c1d95',
        borderRadius: 3,
        display: 'flex',
      }} />
      {/* 上横バー */}
      <div style={{
        position: 'absolute',
        left: 40,
        top: 30,
        width: 97,
        height: 24,
        background: '#4c1d95',
        borderRadius: 3,
        display: 'flex',
      }} />
      {/* 中横バー */}
      <div style={{
        position: 'absolute',
        left: 40,
        top: 79,
        width: 72,
        height: 21,
        background: '#4c1d95',
        borderRadius: 3,
        display: 'flex',
      }} />
    </div>,
    size,
  )
}
