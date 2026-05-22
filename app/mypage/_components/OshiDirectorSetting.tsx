'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { setOshiDirector, clearOshiDirector } from '../actions'

interface Props {
  current: string | null
}

export function OshiDirectorSetting({ current }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [oshi, setOshi] = useState(current)

  const confirm = async () => {
    const name = input.trim()
    if (!name) return
    setSaving(true)
    await setOshiDirector(name)
    setOshi(name)
    setEditing(false)
    setInput('')
    setSaving(false)
    router.refresh()
  }

  const clear = async () => {
    setSaving(true)
    await clearOshiDirector()
    setOshi(null)
    setSaving(false)
    router.refresh()
  }

  const startEditing = () => {
    setEditing(true)
    setInput('')
  }

  return (
    <div className="rounded-lg border border-white/8 bg-white/3 p-4">
      <p
        className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-white/30"
        style={{ fontFamily: 'ui-monospace, monospace' }}
      >
        推し監督
      </p>

      {!editing ? (
        <div className="flex items-center justify-between gap-3">
          {oshi ? (
            <span className="text-[14px] font-bold text-white">{oshi}</span>
          ) : (
            <span className="text-[13px] text-white/30">まだ設定されていません</span>
          )}
          <div className="flex shrink-0 gap-2">
            <button
              onClick={startEditing}
              className="rounded-md border border-white/12 px-3 py-1.5 text-[11px] text-white/50 transition-colors hover:border-white/20 hover:text-white"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {oshi ? '変更' : '設定する'}
            </button>
            {oshi && (
              <button
                onClick={clear}
                disabled={saving}
                className="rounded-md border border-white/8 px-3 py-1.5 text-[11px] text-white/30 transition-colors hover:border-white/12 hover:text-white/60 disabled:opacity-40"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                解除
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/30" />
            <input
              autoFocus
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') confirm() }}
              placeholder="監督名を入力"
              className="w-full rounded-lg bg-white/8 py-2.5 pl-9 pr-4 text-[13px] text-white outline-none placeholder:text-white/30 focus:bg-white/12 transition-colors"
            />
          </div>

          {input.trim() && (
            <button
              onClick={confirm}
              disabled={saving}
              className="w-full rounded-lg bg-red-600 py-2.5 text-[13px] font-bold text-white transition-opacity disabled:opacity-50"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {saving ? '保存中...' : `「${input.trim()}」を推しに設定する`}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
