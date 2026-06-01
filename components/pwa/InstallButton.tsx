'use client'

import { useState } from 'react'
import { Download, Share, Plus, Check } from 'lucide-react'
import { usePwaInstall } from '@/lib/pwa-install'

type Props = {
  /** standalone（インストール済み）でも要素を残す場合の表示 */
  showWhenInstalled?: boolean
}

/**
 * PWAインストールCTA（施策3）。
 * - Android/Chrome: ワンタップでインストールプロンプト
 * - iOS Safari: 「共有 → ホーム画面に追加」の手順を案内
 * - インストール済み: 既定では何も出さない
 */
export function InstallButton({ showWhenInstalled = false }: Props) {
  const { canInstall, isIOS, isStandalone, promptInstall } = usePwaInstall()
  const [showIosHelp, setShowIosHelp] = useState(false)
  const [installed, setInstalled] = useState(false)

  if (isStandalone || installed) {
    if (!showWhenInstalled) return null
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-green-500/30 bg-green-500/10 px-5 py-3.5 text-[14px] font-bold text-green-400">
        <Check size={18} />
        アプリとして利用中
      </div>
    )
  }

  // Android 系: プロンプトが使える
  if (canInstall) {
    return (
      <button
        onClick={async () => {
          const ok = await promptInstall()
          if (ok) setInstalled(true)
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3.5 text-[15px] font-bold text-white transition-opacity active:opacity-80"
        style={{ WebkitTapHighlightColor: 'transparent' }}
      >
        <Download size={18} />
        ホーム画面に追加（インストール不要）
      </button>
    )
  }

  // iOS Safari: 手順案内
  if (isIOS) {
    return (
      <div className="flex flex-col gap-2">
        <button
          onClick={() => setShowIosHelp((v) => !v)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3.5 text-[15px] font-bold text-white transition-colors active:opacity-80"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          <Download size={18} />
          ホーム画面に追加する方法
        </button>
        {showIosHelp && (
          <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/3 px-4 py-3 text-[13px] text-white/75">
            <div className="flex items-center gap-2">
              <Share size={16} className="shrink-0 text-red-400" />
              <span>① 画面下の「共有」ボタンをタップ</span>
            </div>
            <div className="flex items-center gap-2">
              <Plus size={16} className="shrink-0 text-red-400" />
              <span>②「ホーム画面に追加」を選ぶ</span>
            </div>
            <p className="text-[11px] text-white/50">
              ※ アプリとして開くと通知が受け取れるようになります
            </p>
          </div>
        )}
      </div>
    )
  }

  // 非対応ブラウザ（PC等）: 何も出さない
  return null
}
