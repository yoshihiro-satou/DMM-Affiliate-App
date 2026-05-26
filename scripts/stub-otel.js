// Minimal @opentelemetry/api stub for Cloudflare Workers
// Implements no-op versions of the functions used by Next.js
'use strict'

const NOOP_SPAN = {
  spanContext: () => ({ traceId: '', spanId: '', traceFlags: 0 }),
  setAttribute: () => NOOP_SPAN,
  setAttributes: () => NOOP_SPAN,
  addEvent: () => NOOP_SPAN,
  addLink: () => NOOP_SPAN,
  addLinks: () => NOOP_SPAN,
  setStatus: () => NOOP_SPAN,
  updateName: () => NOOP_SPAN,
  end: () => {},
  isRecording: () => false,
  recordException: () => {},
}

const NOOP_TRACER = {
  startSpan: () => NOOP_SPAN,
  startActiveSpan: (name, optOrFn, ctxOrFn, fn) => {
    const f = typeof fn === 'function' ? fn : typeof ctxOrFn === 'function' ? ctxOrFn : optOrFn
    if (typeof f === 'function') return f(NOOP_SPAN)
  },
}

const NOOP_CONTEXT = {
  getValue: () => undefined,
  setValue: (key, val) => NOOP_CONTEXT,
  deleteValue: (key) => NOOP_CONTEXT,
}

module.exports = {
  // Context key creation
  createContextKey: (description) => Symbol(description),

  // Root context
  ROOT_CONTEXT: NOOP_CONTEXT,

  // Context API
  context: {
    active: () => NOOP_CONTEXT,
    with: (ctx, fn, thisArg, ...args) => fn.apply(thisArg, args),
    bind: (ctx, target) => target,
    disable: () => {},
    createKey: (description) => Symbol(description),
  },

  // Trace API
  trace: {
    getTracer: () => NOOP_TRACER,
    getTracerProvider: () => ({ getTracer: () => NOOP_TRACER }),
    setGlobalTracerProvider: () => false,
    getActiveSpan: () => NOOP_SPAN,
    getSpan: () => NOOP_SPAN,
    setSpan: (ctx) => ctx,
    deleteSpan: (ctx) => ctx,
    wrapSpanContext: () => NOOP_SPAN,
    isSpanContextValid: () => false,
    getSpanContext: () => undefined,
    INVALID_SPANID: '0000000000000000',
    INVALID_TRACEID: '00000000000000000000000000000000',
  },

  SpanKind: { INTERNAL: 0, SERVER: 1, CLIENT: 2, PRODUCER: 3, CONSUMER: 4 },
  SpanStatusCode: { UNSET: 0, OK: 1, ERROR: 2 },
  TraceFlags: { NONE: 0, SAMPLED: 1 },
  SamplingDecision: { NOT_RECORD: 0, RECORD: 1, RECORD_AND_SAMPLED: 2 },

  // Propagation API
  propagation: {
    inject: () => {},
    extract: (ctx) => ctx,
    fields: () => [],
    disable: () => {},
    setGlobalPropagator: () => false,
    createBaggage: () => ({ getAllEntries: () => [], getEntry: () => undefined, setEntry: () => {}, removeEntry: () => {}, clear: () => {}, getAll: () => {} }),
    getBaggage: () => undefined,
    setBaggage: (ctx) => ctx,
    deleteBaggage: (ctx) => ctx,
  },

  // Diagnostic API
  diag: {
    setLogger: () => false,
    disable: () => {},
    createComponentLogger: () => ({
      error: () => {}, warn: () => {}, info: () => {}, debug: () => {}, verbose: () => {}
    }),
    error: () => {}, warn: () => {}, info: () => {}, debug: () => {}, verbose: () => {}
  },
  DiagLogLevel: { NONE: 0, ERROR: 30, WARN: 50, INFO: 60, DEBUG: 70, VERBOSE: 80, ALL: 9999 },
  DiagConsoleLogger: class { error() {} warn() {} info() {} debug() {} verbose() {} },

  // Metrics
  createNoopMeter: () => ({
    createCounter: () => ({ add: () => {} }),
    createUpDownCounter: () => ({ add: () => {} }),
    createHistogram: () => ({ record: () => {} }),
    createGauge: () => ({ record: () => {} }),
    createObservableGauge: () => ({ addCallback: () => {}, removeCallback: () => {} }),
    createObservableCounter: () => ({ addCallback: () => {}, removeCallback: () => {} }),
    createObservableUpDownCounter: () => ({ addCallback: () => {}, removeCallback: () => {} }),
    createBatchObservable: () => ({ addCallback: () => {} }),
  }),
  ValueType: { INT: 0, DOUBLE: 1 },

  // Misc
  baggageEntryMetadataFromString: (str) => ({ toString: () => str }),
  defaultTextMapGetter: { get: () => undefined, keys: () => [] },
  defaultTextMapSetter: { set: () => {} },
  isSpanContextValid: () => false,
  isValidTraceId: () => false,
  isValidSpanId: () => false,
  createTraceState: () => ({ set: () => {}, unset: () => {}, get: () => undefined, serialize: () => '' }),

  ProxyTracer: class {},
  ProxyTracerProvider: class {},
}
