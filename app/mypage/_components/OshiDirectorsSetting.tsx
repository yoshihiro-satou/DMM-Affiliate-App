'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { addOshiDirector, removeOshiDirector } from '../actions'
import { MAX_OSHI_DIRECTORS } from '@/lib/constants/oshi'

interface Props {
  current: string[]
}

/**
 * 推し監督の複数登録（最大5人・追加19）。監督は DMM 検索APIが無いため自由入力。
 * 推し女優（OshiActressSetting）と UI を統一する。
 */
export function OshiDirectorsSetting({ current }: Props) {
  const router = useRouter()
  const [list, setList] = useState<string[]>(current)
  const [adding, setAdding] = useState(false)
  const [input, setInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [limitMsg, setLimitMsg] = useState(false)

  const full = list.length >= MAX_OSHI_DIRECTORS

  const add = async () => {
    const name = input.trim()
    if (!name || saving) return
    if (list.some((d) => d === name)) {
      setInput('')
      return
    }
    if (list.length >= MAX_OSHI_DIRECTORS) {
      setLimitMsg(true)
      return
    }
    setSaving(true)
    setList((prev) => [...prev, name]) // 楽観的更新
    const res = await addOshiDirector(name)
    if (!res.ok) {
      setList((prev) => prev.filter((d) => d !== name))
      if (res.limitReached) setLimitMsg(true)
    }
    setAdding(false)
    setInput('')
    setSaving(false)
    router.refresh()
  }

  const remove = async (name: string) => {
    setSaving(true)
    setLimitMsg(false)
    setList((prev) => prev.filter((d) => d !== name)) // 楽観的更新
    await removeOshiDirector(name)
    setSaving(false)
    router.refresh()
  }

  const startAdding = () => {
    setAdding(true)
    setInput('')
    setLimitMsg(false)
  }

  return (
    <div className="rounded-lg border border-white/8 bg-white/3 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p
          className="text-[10px] font-semibold tracking-[0.2em] text-white/55"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          推し監督
        </p>
        <span className="text-[11px] tabular-nums text-white/45">
          {list.length} / {MAX_OSHI_DIRECTORS}
        </span>
      </div>

      {/* 登録済みリスト */}
      {list.length > 0 ? (
        <ul className="mb-3 flex flex-col gap-2">
          {list.map((name) => (
            <li key={name} className="flex items-center justify-between gap-2">
              <span className="truncate text-[14px] font-bold text-white">{name}</span>
              <button
                onClick={() => remove(name)}
                disabled={saving}
                aria-label={`${name}を解除`}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/8 text-white/45 transition-colors hover:border-white/15 hover:text-white/70 disabled:opacity-40"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-[13px] text-white/55">まだ登録されていません</p>
      )}

      {/* 追加 */}
      {!adding ? (
        <button
          onClick={startAdding}
          disabled={full}
          className="w-full rounded-md border border-white/12 py-2 text-[12px] text-white/70 transition-colors hover:border-white/20 hover:text-white disabled:opacity-40"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {full ? `登録上限（${MAX_OSHI_DIRECTORS}人）です` : '＋ 推し監督を追加'}
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/55" />
            <input
              autoFocus
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') add()
              }}
              placeholder="監督名を入力"
              className="w-full rounded-lg bg-white/8 py-2.5 pl-9 pr-4 text-[13px] text-white outline-none placeholder:text-white/55 focus:bg-white/12 transition-colors"
            />
          </div>

          {input.trim() && (
            <button
              onClick={add}
              disabled={saving}
              className="w-full rounded-lg bg-red-600 py-2.5 text-[13px] font-bold text-white transition-opacity disabled:opacity-50"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {saving ? '保存中...' : `「${input.trim()}」を推しに追加する`}
            </button>
          )}

          <button
            onClick={() => setAdding(false)}
            className="text-[12px] text-white/50 transition-colors hover:text-white/70"
          >
            閉じる
          </button>
        </div>
      )}

      {limitMsg && (
        <p className="mt-2 text-[11px] text-white/55">
          推し監督は{MAX_OSHI_DIRECTORS}人までです。不要な推しを解除してから追加してください。
        </p>
      )}
    </div>
  )
}
