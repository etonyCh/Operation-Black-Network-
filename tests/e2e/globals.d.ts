/**
 * Global type augmentation for Playwright E2E tests.
 *
 * `window.api` is exposed by the Electron preload script via contextBridge.
 * Inside `page.evaluate(...)` callbacks TypeScript runs against the DOM lib,
 * so we augment Window here to get full type-checking on window.api calls.
 */
import type { BlackNetworkAPI } from '../../src/preload/api'

declare global {
  interface Window {
    api: BlackNetworkAPI
  }
}

export {}
