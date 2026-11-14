// Some wallet modules still expect Node's Buffer and process in the browser.
import { Buffer } from 'buffer'

const g = globalThis as unknown as { Buffer?: typeof Buffer; process?: unknown }
if (!g.Buffer) g.Buffer = Buffer
if (!g.process) {
  g.process = { env: {}, browser: true, version: '', versions: {}, nextTick: (fn: () => void) => queueMicrotask(fn) }
}
