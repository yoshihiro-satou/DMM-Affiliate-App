'use client'

import { useState } from 'react'
import { X } from 'lucide-react'
import { setOshiActress, clearOshiActress } from '../actions'

interface Props {
  current: { id: string | null; name: string } | null
}

export function OshiActressSetting({ current }: Props) {
  const [editing, setEditing] = useState(false)
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [oshi, setOshi] = useState(current)

  const save = async () => {
    const name = input.trim()
    if (!name) return
    setSaving(true)
    await setOshiActress('', name)
    setOshi({ id: null, name })
    setEditing(false)
    setInput('')
    setSaving(false)
  }

  const clear = async () => {
    setSaving(true)
    await clearOshiActress()
    setOshi(null)
    setSaving(false)
  }

  const cancelEdit = () => {
    setEditing(false)
    setInput('')
  }

  return (
    <div className="rounded-lg border border-white/8 bg-white/3 p-4">
      <p
        className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-white/30"
        style={{ fontFamily: 'ui-monospace, monospace' }}
      >
        OSHI ACTRESS
      </p>

      {!editing ? (
        <div className="flex items-center justify-between gap-3">
          {oshi ? (
            <span className="text-[14px] font-bold text-white">{oshi.name}</span>
          ) : (
            <span className="text-[13px] text-white/30">まだ設定されていません</span>
          )}
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => { setInput(oshi?.name ?? ''); setEditing(true) }}
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
        <div className="flex gap-2">
          <input
            autoFocus
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') save() }}
            placeholder="女優名を入力..."
            className="flex-1 rounded-md border border-white/12 bg-white/5 px-3 py-2 text-[13px] text-white placeholder:text-white/20 focus:border-red-600/50 focus:outline-none"
          />
          <button
            onClick={save}
            disabled={saving || !input.trim()}
            className="rounded-md bg-red-700/80 px-4 py-2 text-[12px] font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            保存
          </button>
          <button
            onClick={cancelEdit}
            className="flex items-center justify-center rounded-md border border-white/8 px-3 text-white/30 transition-colors hover:text-white/60"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <X size={13} />
          </button>
        </div>
      )}
    </div>
  )
}
