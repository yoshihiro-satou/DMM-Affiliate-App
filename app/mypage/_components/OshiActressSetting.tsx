'use client'

import { useState, useRef } from 'react'
import { Search, X } from 'lucide-react'
import type { DmmActress } from '@/types/dmm'
import { setOshiActress, clearOshiActress } from '../actions'

interface Props {
  current: { id: string | null; name: string } | null
}

export function OshiActressSetting({ current }: Props) {
  const [editing, setEditing] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DmmActress[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [oshi, setOshi] = useState(current)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const search = (q: string) => {
    setQuery(q)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!q.trim()) { setResults([]); return }
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/dmm/actresses?keyword=${encodeURIComponent(q)}&hits=8`)
        const data = await res.json()
        setResults(data.result?.actress ?? [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 400)
  }

  const select = async (actress: DmmActress) => {
    setSaving(true)
    await setOshiActress(actress.id, actress.name)
    setOshi({ id: actress.id, name: actress.name })
    setEditing(false)
    setQuery('')
    setResults([])
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
    setQuery('')
    setResults([])
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
            <a
              href={`/actress/${oshi.id}`}
              className="text-[14px] font-bold text-white transition-colors hover:text-red-400"
            >
              {oshi.name}
            </a>
          ) : (
            <span className="text-[13px] text-white/30">まだ設定されていません</span>
          )}
          <div className="flex shrink-0 gap-2">
            <button
              onClick={() => setEditing(true)}
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
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => search(e.target.value)}
                placeholder="女優名で検索..."
                className="w-full rounded-md border border-white/12 bg-white/5 py-2 pl-8 pr-3 text-[13px] text-white placeholder:text-white/20 focus:border-red-600/50 focus:outline-none"
              />
            </div>
            <button
              onClick={cancelEdit}
              className="flex items-center justify-center rounded-md border border-white/8 px-3 text-white/30 transition-colors hover:text-white/60"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              <X size={13} />
            </button>
          </div>

          {loading && <p className="text-[11px] text-white/30">検索中...</p>}

          {results.length > 0 && (
            <ul className="flex flex-col divide-y divide-white/5">
              {results.map((a) => (
                <li key={a.id}>
                  <button
                    onClick={() => select(a)}
                    disabled={saving}
                    className="w-full px-2 py-2.5 text-left text-[13px] text-white/70 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-40"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    {a.name}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!loading && query.trim() && results.length === 0 && (
            <p className="text-[11px] text-white/30">見つかりませんでした</p>
          )}
        </div>
      )}
    </div>
  )
}
