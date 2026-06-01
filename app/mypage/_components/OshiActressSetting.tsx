'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import type { DmmActress } from '@/types/dmm'
import { addOshiActress, removeOshiActress } from '../actions'
import { MAX_OSHI_ACTRESSES } from '@/lib/constants/oshi'

type Oshi = { id: string; name: string }

interface Props {
  current: Oshi[]
}

export function OshiActressSetting({ current }: Props) {
  const router = useRouter()
  const [list, setList] = useState<Oshi[]>(current)
  const [adding, setAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DmmActress[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [limitMsg, setLimitMsg] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const full = list.length >= MAX_OSHI_ACTRESSES

  useEffect(() => {
    const q = query.trim()
    if (debounceRef.current) clearTimeout(debounceRef.current)
    // setState は effect 本体ではなくコールバック内でのみ呼ぶ
    debounceRef.current = setTimeout(async () => {
      if (!q) {
        setResults([])
        setLoading(false)
        return
      }
      setLoading(true)
      try {
        const res = await fetch(`/api/dmm/actresses?keyword=${encodeURIComponent(q)}&hits=8`)
        const data = await res.json()
        setResults(data.actress ?? [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, q ? 300 : 0)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const add = async (actress: DmmActress) => {
    if (list.some((o) => o.id === actress.id)) return
    if (list.length >= MAX_OSHI_ACTRESSES) {
      setLimitMsg(true)
      return
    }
    setSaving(true)
    setList((prev) => [...prev, { id: actress.id, name: actress.name }]) // 楽観的更新
    const res = await addOshiActress(actress.id, actress.name)
    if (!res.ok) {
      setList((prev) => prev.filter((o) => o.id !== actress.id))
      if (res.limitReached) setLimitMsg(true)
    }
    setAdding(false)
    setQuery('')
    setResults([])
    setSaving(false)
    router.refresh()
  }

  const remove = async (actressId: string) => {
    setSaving(true)
    setLimitMsg(false)
    setList((prev) => prev.filter((o) => o.id !== actressId)) // 楽観的更新
    await removeOshiActress(actressId)
    setSaving(false)
    router.refresh()
  }

  const startAdding = () => {
    setAdding(true)
    setQuery('')
    setResults([])
    setLimitMsg(false)
  }

  return (
    <div className="rounded-lg border border-white/8 bg-white/3 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p
          className="text-[10px] font-semibold tracking-[0.2em] text-white/55"
          style={{ fontFamily: 'ui-monospace, monospace' }}
        >
          推し女優
        </p>
        <span className="text-[11px] tabular-nums text-white/45">
          {list.length} / {MAX_OSHI_ACTRESSES}
        </span>
      </div>

      {/* 登録済みリスト */}
      {list.length > 0 ? (
        <ul className="mb-3 flex flex-col gap-2">
          {list.map((o) => (
            <li key={o.id} className="flex items-center justify-between gap-2">
              <a
                href={`/actress/${o.id}`}
                className="truncate text-[14px] font-bold text-white transition-colors hover:text-red-400"
              >
                {o.name}
              </a>
              <button
                onClick={() => remove(o.id)}
                disabled={saving}
                aria-label={`${o.name}を解除`}
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
          {full ? `登録上限（${MAX_OSHI_ACTRESSES}人）です` : '＋ 推し女優を追加'}
        </button>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/55" />
            <input
              autoFocus
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="女優名で検索"
              className="w-full rounded-lg bg-white/8 py-2.5 pl-9 pr-4 text-[13px] text-white outline-none placeholder:text-white/55 focus:bg-white/12 transition-colors"
            />
          </div>

          {loading && <p className="text-[11px] text-white/55">検索中...</p>}

          {results.length > 0 && (
            <ul className="flex flex-col divide-y divide-white/5">
              {results.map((a) => {
                const already = list.some((o) => o.id === a.id)
                return (
                  <li key={a.id} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="px-2 text-[13px] text-white/70">{a.name}</span>
                    <button
                      onClick={() => add(a)}
                      disabled={saving || already}
                      className="shrink-0 rounded-md bg-red-600 px-3 py-1.5 text-[11px] font-bold text-white transition-opacity disabled:opacity-40"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      {already ? '登録済み' : '追加'}
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <p className="text-[11px] text-white/55">見つかりませんでした</p>
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
          推し女優は{MAX_OSHI_ACTRESSES}人までです。不要な推しを解除してから追加してください。
        </p>
      )}
    </div>
  )
}
