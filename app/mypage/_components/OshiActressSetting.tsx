'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import type { DmmActress } from '@/types/dmm'
import { setOshiActress, clearOshiActress } from '../actions'

interface Props {
  current: { id: string | null; name: string } | null
}

export function OshiActressSetting({ current }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<DmmActress[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [oshi, setOshi] = useState(current)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!query.trim()) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/dmm/actresses?keyword=${encodeURIComponent(query.trim())}&hits=8`)
        const data = await res.json()
        setResults(data.actress ?? [])
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const confirm = async (actress: DmmActress) => {
    setSaving(true)
    await setOshiActress(actress.id, actress.name)
    setOshi({ id: actress.id, name: actress.name })
    setEditing(false)
    setQuery('')
    setResults([])
    setSaving(false)
    router.refresh()
  }

  const clear = async () => {
    setSaving(true)
    await clearOshiActress()
    setOshi(null)
    setSaving(false)
    router.refresh()
  }

  const startEditing = () => {
    setEditing(true)
    setQuery('')
    setResults([])
  }

  return (
    <div className="rounded-lg border border-white/8 bg-white/3 p-4">
      <p
        className="mb-3 text-[10px] font-semibold tracking-[0.2em] text-white/30"
        style={{ fontFamily: 'ui-monospace, monospace' }}
      >
        推し女優
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
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="女優名で検索"
              className="w-full rounded-lg bg-white/8 py-2.5 pl-9 pr-4 text-[13px] text-white outline-none placeholder:text-white/30 focus:bg-white/12 transition-colors"
            />
          </div>

          {loading && <p className="text-[11px] text-white/30">検索中...</p>}

          {results.length > 0 && (
            <ul className="flex flex-col divide-y divide-white/5">
              {results.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className="text-[13px] text-white/70 px-2">{a.name}</span>
                  <button
                    onClick={() => confirm(a)}
                    disabled={saving}
                    className="shrink-0 rounded-md bg-red-600 px-3 py-1.5 text-[11px] font-bold text-white transition-opacity disabled:opacity-50"
                    style={{ WebkitTapHighlightColor: 'transparent' }}
                  >
                    設定する
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
