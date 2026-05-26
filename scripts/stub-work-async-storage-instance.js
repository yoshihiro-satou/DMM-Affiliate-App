// Singleton stub for next/dist/server/app-render/work-async-storage-instance.js
// Same globalThis trick as stub-work-unit-async-storage-instance.js
'use strict'
Object.defineProperty(exports, '__esModule', { value: true })
const { AsyncLocalStorage } = require('async_hooks')
if (!globalThis.__NEXT_WAS) {
  globalThis.__NEXT_WAS = new AsyncLocalStorage()
}
Object.defineProperty(exports, 'workAsyncStorageInstance', {
  enumerable: true,
  get: function () { return globalThis.__NEXT_WAS },
})
