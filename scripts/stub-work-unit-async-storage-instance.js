// Singleton stub for next/dist/server/app-render/work-unit-async-storage-instance.js
// Cloudflare Workers: handler.mjs has an inline esbuild-bundled version (instance A)
// while app-route-turbo.runtime.prod.js loads from node_modules (instance B).
// Using globalThis.__NEXT_WUAS ensures both sides share the same AsyncLocalStorage.
'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const { AsyncLocalStorage } = require('async_hooks')
if (!globalThis.__NEXT_WUAS) {
  globalThis.__NEXT_WUAS = new AsyncLocalStorage()
}
Object.defineProperty(exports, 'workUnitAsyncStorageInstance', {
  enumerable: true,
  get: function () { return globalThis.__NEXT_WUAS },
})
