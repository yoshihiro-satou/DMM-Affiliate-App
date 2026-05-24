// @ts-check
'use strict'

const fs = require('fs')
const path = require('path')

const HANDLER_PATH = path.join('.open-next', 'server-functions', 'default', 'handler.mjs')
const MANIFEST_PATH = path.join('.next', 'server', 'middleware-manifest.json')
const CHUNKS_DIR = path.join('.next', 'server', 'chunks')

// Patch 1: getMiddlewareManifest() の動的 require を JSON インライン展開に置換
function patchMiddlewareManifest(handler) {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.warn('[Patch 1] middleware-manifest.json not found — skipping')
    return handler
  }

  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
  const manifestJson = JSON.stringify(manifest)

  const before = `getMiddlewareManifest(){return this.minimalMode?null:require(this.middlewareManifestPath)}`
  const after = `getMiddlewareManifest(){return this.minimalMode?null:${manifestJson}}`

  if (!handler.includes(before)) {
    console.warn('[Patch 1] pattern not found — skipping')
    return handler
  }

  handler = handler.replace(before, after)
  console.log('[Patch 1] middleware-manifest inlined ✓')
  return handler
}

// Patch 2: 空の requireChunk を実チャンクの switch 文に置換（2箇所とも）
function patchRequireChunk(handler) {
  if (!fs.existsSync(CHUNKS_DIR)) {
    console.warn('[Patch 2] .next/server/chunks not found — skipping')
    return handler
  }

  const cases = []

  function collectChunks(dir, prefix) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        collectChunks(path.join(dir, entry.name), `${prefix}/${entry.name}`)
      } else if (entry.name.endsWith('.js')) {
        // キーは "server/chunks/ssr/foo.js" 形式（.next/ からの相対パス）
        const key = `${prefix}/${entry.name}`
        // require のパスは絶対パス・スラッシュ統一
        const abs = path.resolve(dir, entry.name).replace(/\\/g, '/')
        cases.push(`case ${JSON.stringify(key)}: return require(${JSON.stringify(abs)})`)
      }
    }
  }

  collectChunks(CHUNKS_DIR, 'server/chunks')

  if (cases.length === 0) {
    console.warn('[Patch 2] no chunk files found — skipping')
    return handler
  }

  const broken = `function requireChunk(chunkPath){throw new Error(\`Not found \${chunkPath}\`)}`
  const fixed = `function requireChunk(chunkPath){switch(chunkPath){${cases.join(';')}}throw new Error(\`Not found \${chunkPath}\`)}`

  const count = handler.split(broken).length - 1
  if (count === 0) {
    console.warn('[Patch 2] pattern not found — skipping')
    return handler
  }

  // split().join() で全箇所置換（String.replace は最初の1箇所のみ）
  handler = handler.split(broken).join(fixed)
  console.log(`[Patch 2] requireChunk patched (${count} occurrence(s), ${cases.length} chunks) ✓`)
  return handler
}

// Patch 3: externalRequire の thunk() 呼び出しを bundled require_* 関数で置換
// Cloudflare Workers では動的 require(id) が node_modules の未パッチ版を読むため、
// esbuild でバンドル済みの（loadManifest がパッチ済みの）require_* 関数を直接呼ぶ
function patchExternalRequire(handler) {
  const ssrDir = path.join(CHUNKS_DIR, 'ssr')
  if (!fs.existsSync(ssrDir)) {
    console.warn('[Patch 3] .next/server/chunks/ssr not found — skipping')
    return handler
  }

  // 1. SSR チャンクファイルから .x("module-id", ...) の module-id を収集
  const externalIds = new Set()
  function scanChunks(dir) {
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) { scanChunks(full); continue }
      if (!entry.name.endsWith('.js')) continue
      let content
      try { content = fs.readFileSync(full, 'utf8') } catch { continue }
      // .x("module-id", ...) パターン（a.x, e.x, r.x など）
      const re = /\.x\("([^"]+)"/g
      let m
      while ((m = re.exec(content)) !== null) {
        externalIds.add(m[1])
      }
    }
  }
  scanChunks(ssrDir)

  if (externalIds.size === 0) {
    console.warn('[Patch 3] no .x() calls found in SSR chunks — skipping')
    return handler
  }

  // 2. 各 module-id に対応する require_* 変数が handler.mjs に存在するか確認
  //    __commonJS({"node_modules/.../<suffix>"( のパターンで検索
  function findRequireVar(moduleId) {
    // moduleId の末尾パス部分 (e.g. "app-page-turbo.runtime.prod.js") で検索
    // handler.mjs 内の var require_xxx=__commonJS({".../<moduleId>"( を探す
    const suffix = '/' + moduleId + '"'
    const pos = handler.indexOf(suffix)
    if (pos < 0) return null
    // suffix の前 500 文字から var require_xxx=__commonJS を探す
    const lookback = handler.substring(Math.max(0, pos - 600), pos)
    const m = /var (require_\w+)=__commonJS\(\{/.exec(lookback)
    return m ? m[1] : null
  }

  const cases = []
  for (const id of [...externalIds].sort()) {
    const varName = findRequireVar(id)
    if (varName) {
      cases.push({ id, varName })
      console.log(`[Patch 3]   ${id} => ${varName}`)
    } else {
      console.log(`[Patch 3]   ${id} => not bundled, falls through to thunk()`)
    }
  }

  if (cases.length === 0) {
    console.warn('[Patch 3] no bundled external modules found — skipping')
    return handler
  }

  // 3. switch 文を生成
  const switchCases = cases
    .map(({ id, varName }) => `case ${JSON.stringify(id)}:raw=${varName}();break`)
    .join(';')

  // 両 Turbopack ランタイムの externalRequire を同時置換
  const before = `function externalRequire(id,thunk,esm2=!1){let raw;try{raw=thunk()}`
  const after = `function externalRequire(id,thunk,esm2=!1){let raw;try{switch(id){${switchCases};default:raw=thunk()}}`

  const count = handler.split(before).length - 1
  if (count === 0) {
    console.warn('[Patch 3] externalRequire pattern not found — skipping')
    return handler
  }

  handler = handler.split(before).join(after)
  console.log(`[Patch 3] externalRequire patched (${count} runtime(s), ${cases.length} modules) ✓`)
  return handler
}

// Main
if (!fs.existsSync(HANDLER_PATH)) {
  console.error(`handler.mjs not found: ${HANDLER_PATH}`)
  console.error('先に opennextjs-cloudflare build を実行してください')
  process.exit(1)
}

let handler = fs.readFileSync(HANDLER_PATH, 'utf8')
handler = patchMiddlewareManifest(handler)
handler = patchRequireChunk(handler)
handler = patchExternalRequire(handler)
fs.writeFileSync(HANDLER_PATH, handler, 'utf8')
console.log('patch-worker: done')
