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
  if (!fs.existsSync(CHUNKS_DIR)) {
    console.warn('[Patch 3] .next/server/chunks not found — skipping')
    return handler
  }

  // 1. 全チャンクファイルから .x("module-id", ...) の module-id を収集
  //    SSR チャンク（ssr/）だけでなくルートレベルのチャンク（API routes 等）も対象
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
  scanChunks(CHUNKS_DIR)

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

// Patch 4: load-manifest-stub.js を生成（wrangler alias で app-route-turbo に注入）
// app-route-turbo.runtime.prod.js は wrangler が deploy 時にバンドルするが、
// その際 load-manifest.external.js が node_modules の未パッチ版（readFileSync あり）を
// 参照する。wrangler.toml の [alias] でこのスタブに差し替えることで readFileSync を回避する。
function generateLoadManifestStub() {
  // opennextjs-cloudflare が実際に使うのは .open-next/server-functions/default/.next/ のマニフェスト
  // （ソースの .next/ より少ない: ~32 ファイル）。これを使うことで過不足なく収集できる。
  const OPEN_NEXT_DIR = path.join('.open-next', 'server-functions', 'default', '.next')
  const NEXT_DIR = fs.existsSync(OPEN_NEXT_DIR) ? OPEN_NEXT_DIR : '.next'
  const STUB_PATH = path.join('scripts', 'load-manifest-stub.js')

  if (!fs.existsSync(NEXT_DIR)) {
    console.warn('[Patch 4] .next/ not found — skipping stub generation')
    return
  }

  // .next/ 以下のマニフェスト JSON を収集（standalone / cache / trace / dev は除外）
  // endsWith キーは "/" + .next/ からの相対パス（posix スラッシュ）
  // 例: "/routes-manifest.json", "/server/app-paths-manifest.json"
  const SKIP_DIRS = new Set(['standalone', 'cache', 'trace', 'dev'])
  const manifests = []

  function collectManifests(dir, relFromDotNext) {
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue
        collectManifests(full, `${relFromDotNext}/${entry.name}`)
        continue
      }
      if (!entry.name.endsWith('.json')) continue
      if (
        entry.name.endsWith('-manifest.json') ||
        entry.name === 'required-server-files.json' ||
        entry.name === 'prefetch-hints.json'
      ) {
        const key = `${relFromDotNext}/${entry.name}` // e.g. "/routes-manifest.json"
        try {
          const content = fs.readFileSync(full, 'utf8')
          manifests.push({ key, content })
        } catch { /* skip */ }
      }
    }
  }
  collectManifests(NEXT_DIR, '')

  // BUILD_ID
  let buildId = ''
  const buildIdPath = path.join(NEXT_DIR, 'BUILD_ID')
  if (fs.existsSync(buildIdPath)) {
    buildId = fs.readFileSync(buildIdPath, 'utf8').trim()
  }

  // 長いパスを先にマッチ（特定のファイルが汎用サフィックスより先にヒットするよう）
  manifests.sort((a, b) => b.key.length - a.key.length)

  // Map エントリとして生成
  const mapEntries = manifests
    .map(({ key, content }) => `  [${JSON.stringify(key)}, ${content}]`)
    .join(',\n')

  const stub = `'use strict'
// Auto-generated by scripts/patch-worker.js — do not edit manually
// Inlined .next/ manifests for Cloudflare Workers (no filesystem access).
// Consumed via wrangler.toml [alias] "next/dist/server/load-manifest.external.js".

const _cache = new Map()
const BUILD_ID = ${JSON.stringify(buildId)}

// Manifest lookup: endsWith key ("/routes-manifest.json" etc.) → parsed JSON
const MANIFEST_MAP = new Map([
${mapEntries}
])

// Known optional manifests (Next.js loads with handleMissing:true)
const OPTIONAL_SUFFIXES = [
  'react-loadable-manifest',
  'subresource-integrity-manifest',
  'server-reference-manifest',
  'dynamic-css-manifest',
  'fallback-build-manifest',
  'prefetch-hints',
]

function normPath(p) { return typeof p === 'string' ? p.replace(/\\\\/g, '/') : p }

function loadManifest(filePath, shouldCache, cache, _skipParse, handleMissing) {
  if (shouldCache === undefined) shouldCache = true
  if (cache === undefined) cache = _cache
  const p = normPath(filePath)
  const cached = shouldCache && cache.get(p)
  if (cached) return cached

  // BUILD_ID
  if (p.endsWith('/BUILD_ID') || p.endsWith('.next/BUILD_ID')) {
    const r = BUILD_ID
    if (shouldCache) cache.set(p, r)
    return r
  }

  // Inlined manifest lookup — also try with leading "/" for bare filenames
  const pSlash = p.startsWith('/') ? p : '/' + p
  for (const [key, val] of MANIFEST_MAP) {
    if (pSlash.endsWith(key)) {
      if (shouldCache) cache.set(p, val)
      return val
    }
  }

  // Known optional manifests — return {} instead of crashing
  const base = p.replace(/\\.json$/, '')
  for (const suffix of OPTIONAL_SUFFIXES) {
    if (base.endsWith(suffix)) {
      if (shouldCache) cache.set(p, {})
      return {}
    }
  }

  if (shouldCache) cache.set(p, {})
  return {}
}

function loadManifestFromRelativePath(relativePathOrOpts, distDir, shouldCache, cache) {
  // Next.js 16: called as ({projectDir, distDir, manifest, shouldCache, handleMissing, useEval})
  // Older API:  called as (relativePath, distDir, shouldCache, cache)
  if (relativePathOrOpts !== null && typeof relativePathOrOpts === 'object') {
    const { projectDir, distDir: d, manifest, shouldCache: sc, handleMissing, useEval } = relativePathOrOpts
    if (typeof manifest !== 'string') return {}
    const base = typeof d === 'string' ? d.replace(/\\\\/g, '/') : ''
    const proj = typeof projectDir === 'string' ? projectDir.replace(/\\\\/g, '/') : ''
    const full = proj ? proj + '/' + base + '/' + manifest : base + '/' + manifest
    if (useEval) return evalManifest(full, sc, cache, handleMissing)
    return loadManifest(full, sc, cache, undefined, handleMissing)
  }
  // Positional arguments fallback
  if (typeof relativePathOrOpts !== 'string') return {}
  const distNorm = typeof distDir === 'string' ? distDir.replace(/\\\\/g, '/') : ''
  const full = distNorm + '/' + relativePathOrOpts.replace(/\\\\/g, '/')
  return loadManifest(full, shouldCache, cache)
}

function evalManifest(filePath) {
  const p = normPath(filePath)
  if (p.endsWith('_client-reference-manifest.js')) return { __RSC_MANIFEST: {} }
  return {}
}

function clearManifestCache() { _cache.clear() }

module.exports = { loadManifest, loadManifestFromRelativePath, evalManifest, clearManifestCache }
`

  fs.writeFileSync(STUB_PATH, stub, 'utf8')
  console.log(`[Patch 4] load-manifest-stub.js generated (${manifests.length} manifests, BUILD_ID=${buildId.slice(0, 8)}…) ✓`)
}

// Patch 5: load-manifest.external.js を .open-next の node_modules 内でスタブに置き換える
// handler.mjs は a("../load-manifest.external") という Turbopack 内部 require を使うため
// wrangler.toml の [alias] では補足できない。実ファイルを上書きすることで確実に差し替える。
function overwriteLoadManifestExternal() {
  const STUB_PATH = path.join('scripts', 'load-manifest-stub.js')
  if (!fs.existsSync(STUB_PATH)) {
    console.warn('[Patch 5] load-manifest-stub.js not found — skipping')
    return
  }
  const stubContent = fs.readFileSync(STUB_PATH, 'utf8')

  // .open-next/server-functions/default/node_modules 以下の load-manifest.external.js を探して上書き
  const openNextNodeModules = path.join('.open-next', 'server-functions', 'default', 'node_modules')
  if (!fs.existsSync(openNextNodeModules)) {
    console.warn('[Patch 5] .open-next node_modules not found — skipping')
    return
  }

  let count = 0
  function overwrite(dir) {
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) { overwrite(full); continue }
      if (entry.name === 'load-manifest.external.js') {
        fs.writeFileSync(full, stubContent, 'utf8')
        console.log(`[Patch 5]   overwritten: ${full}`)
        count++
      }
    }
  }
  overwrite(openNextNodeModules)
  if (count === 0) {
    console.warn('[Patch 5] no load-manifest.external.js found — skipping')
  } else {
    console.log(`[Patch 5] load-manifest.external.js overwritten (${count} file(s)) ✓`)
  }
}

// Patch 6: work-unit-async-storage-instance を globalThis singleton に統一
// handler.mjs には esbuild インライン版（instance A）が存在し、
// app-route-turbo.runtime.prod.js は node_modules から別インスタンス（instance B）を読む。
// cookies() は A で getStore() するが context は B で設定されるため "outside request scope" が発生。
// globalThis.__NEXT_WUAS を使って両者を同一インスタンスに統一する。
function patchWorkUnitAsyncStorageInstance(handler) {
  const before = 'workUnitAsyncStorageInstance=(0,_asynclocalstorage.createAsyncLocalStorage)()'
  const after = 'workUnitAsyncStorageInstance=globalThis.__NEXT_WUAS||(globalThis.__NEXT_WUAS=(0,_asynclocalstorage.createAsyncLocalStorage)())'
  if (!handler.includes(before)) {
    console.warn('[Patch 6a] workUnitAsyncStorageInstance pattern not found — skipping')
    return handler
  }
  handler = handler.replace(before, after)
  console.log('[Patch 6a] workUnitAsyncStorageInstance patched to use globalThis ✓')
  return handler
}

function patchWorkAsyncStorageInstance(handler) {
  const before = 'workAsyncStorageInstance=(0,_asynclocalstorage.createAsyncLocalStorage)()'
  const after = 'workAsyncStorageInstance=globalThis.__NEXT_WAS||(globalThis.__NEXT_WAS=(0,_asynclocalstorage.createAsyncLocalStorage)())'
  if (!handler.includes(before)) {
    console.warn('[Patch 6c] workAsyncStorageInstance pattern not found — skipping')
    return handler
  }
  handler = handler.replace(before, after)
  console.log('[Patch 6c] workAsyncStorageInstance patched to use globalThis ✓')
  return handler
}

function overwriteWorkAsyncStorageInstance() {
  const STUB_PATH = path.join('scripts', 'stub-work-async-storage-instance.js')
  if (!fs.existsSync(STUB_PATH)) {
    console.warn('[Patch 6d] stub-work-async-storage-instance.js not found — skipping')
    return
  }
  const stubContent = fs.readFileSync(STUB_PATH, 'utf8')
  const openNextNodeModules = path.join('.open-next', 'server-functions', 'default', 'node_modules')
  if (!fs.existsSync(openNextNodeModules)) {
    console.warn('[Patch 6d] .open-next node_modules not found — skipping')
    return
  }
  let count = 0
  function overwrite(dir) {
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) { overwrite(full); continue }
      if (entry.name === 'work-async-storage-instance.js') {
        fs.writeFileSync(full, stubContent, 'utf8')
        console.log(`[Patch 6d]   overwritten: ${full}`)
        count++
      }
    }
  }
  overwrite(openNextNodeModules)
  if (count === 0) {
    console.warn('[Patch 6d] no work-async-storage-instance.js found — skipping')
  } else {
    console.log(`[Patch 6d] work-async-storage-instance.js overwritten (${count} file(s)) ✓`)
  }
}

function overwriteWorkUnitAsyncStorageInstance() {
  const STUB_PATH = path.join('scripts', 'stub-work-unit-async-storage-instance.js')
  if (!fs.existsSync(STUB_PATH)) {
    console.warn('[Patch 6b] stub-work-unit-async-storage-instance.js not found — skipping')
    return
  }
  const stubContent = fs.readFileSync(STUB_PATH, 'utf8')
  const openNextNodeModules = path.join('.open-next', 'server-functions', 'default', 'node_modules')
  if (!fs.existsSync(openNextNodeModules)) {
    console.warn('[Patch 6b] .open-next node_modules not found — skipping')
    return
  }
  let count = 0
  function overwrite(dir) {
    let entries
    try { entries = fs.readdirSync(dir, { withFileTypes: true }) } catch { return }
    for (const entry of entries) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) { overwrite(full); continue }
      if (entry.name === 'work-unit-async-storage-instance.js') {
        fs.writeFileSync(full, stubContent, 'utf8')
        console.log(`[Patch 6b]   overwritten: ${full}`)
        count++
      }
    }
  }
  overwrite(openNextNodeModules)
  if (count === 0) {
    console.warn('[Patch 6b] no work-unit-async-storage-instance.js found — skipping')
  } else {
    console.log(`[Patch 6b] work-unit-async-storage-instance.js overwritten (${count} file(s)) ✓`)
  }
}

// Patch 6e / 6f: プロジェクトルートの node_modules 内の work-unit / work-async-storage-instance.js を
// globalThis singleton スタブに上書きする。
// wrangler が app-route-turbo.runtime.prod.js を .next/server/chunks/ 経由でバンドルする際、
// esbuild は .next/server/chunks/ 起点でプロジェクトルートの node_modules を参照するため、
// .open-next node_modules とは別にプロジェクトルート側も上書きが必要。
// Turbopack-compatible stub: uses require('./async-local-storage') which Turbopack
// stubs for client builds (avoids 'async_hooks' not available in browser context).
function overwriteInProjectNodeModules(exportName, globalKey, fileName, patchLabel) {
  const stubContent = [
    "'use strict'",
    "Object.defineProperty(exports, '__esModule', { value: true })",
    "const _als = require('./async-local-storage')",
    "if (!globalThis." + globalKey + ") {",
    "  globalThis." + globalKey + " = _als.createAsyncLocalStorage()",
    "}",
    "Object.defineProperty(exports, '" + exportName + "', {",
    "  enumerable: true,",
    "  get: function () { return globalThis." + globalKey + " },",
    "})",
  ].join('\n') + '\n'

  const APP_RENDER_REL = path.join('next', 'dist', 'server', 'app-render', fileName)
  let count = 0

  const pnpmStore = path.join('node_modules', '.pnpm')
  if (fs.existsSync(pnpmStore)) {
    let entries
    try { entries = fs.readdirSync(pnpmStore, { withFileTypes: true }) } catch { entries = [] }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (!entry.name.startsWith('next@')) continue
      const candidate = path.join(pnpmStore, entry.name, 'node_modules', APP_RENDER_REL)
      if (fs.existsSync(candidate)) {
        fs.writeFileSync(candidate, stubContent, 'utf8')
        console.log(`[${patchLabel}]   overwritten: ${candidate}`)
        count++
      }
    }
  }

  const direct = path.join('node_modules', APP_RENDER_REL)
  if (fs.existsSync(direct)) {
    fs.writeFileSync(direct, stubContent, 'utf8')
    console.log(`[${patchLabel}]   overwritten: ${direct}`)
    count++
  }

  if (count === 0) {
    console.warn(`[${patchLabel}] no ${fileName} found in project node_modules — skipping`)
  } else {
    console.log(`[${patchLabel}] ${fileName} overwritten in project node_modules (${count} file(s)) ✓`)
  }
}

// Main
if (!fs.existsSync(HANDLER_PATH)) {
  console.error(`handler.mjs not found: ${HANDLER_PATH}`)
  console.error('先に opennextjs-cloudflare build を実行してください')
  process.exit(1)
}

generateLoadManifestStub()
overwriteLoadManifestExternal()
overwriteWorkUnitAsyncStorageInstance()
overwriteWorkAsyncStorageInstance()
// Patch 6e: プロジェクトルート node_modules の work-unit-async-storage-instance.js を上書き
overwriteInProjectNodeModules(
  'workUnitAsyncStorageInstance',
  '__NEXT_WUAS',
  'work-unit-async-storage-instance.js',
  'Patch 6e'
)
// Patch 6f: プロジェクトルート node_modules の work-async-storage-instance.js を上書き
overwriteInProjectNodeModules(
  'workAsyncStorageInstance',
  '__NEXT_WAS',
  'work-async-storage-instance.js',
  'Patch 6f'
)

let handler = fs.readFileSync(HANDLER_PATH, 'utf8')
handler = patchMiddlewareManifest(handler)
handler = patchRequireChunk(handler)
handler = patchExternalRequire(handler)
handler = patchWorkUnitAsyncStorageInstance(handler)
handler = patchWorkAsyncStorageInstance(handler)
fs.writeFileSync(HANDLER_PATH, handler, 'utf8')
console.log('patch-worker: done')
