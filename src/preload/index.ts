/**
 * @fileoverview Preload Script - IPC Bridge
 * Pour plus d'informations sur l'architecture de ce module et du projet,
 * veuillez consulter le dossier /docs/ à la racine du projet.
 */
import { contextBridge, ipcRenderer } from 'electron'
import { IPC } from '@shared/types/ipc.types'

// ── Channel whitelist ─────────────────────────────────────────────────────────
// Only these channels may be subscribed to by the renderer via window.api.on().
// Invoke channels (ipcRenderer.invoke) are safe by design and do not need listing.

const ALLOWED_RECEIVE_CHANNELS: readonly string[] = [
  IPC.SCAN_DEVICE_FOUND,
  IPC.SCAN_PROGRESS,
  IPC.SCAN_COMPLETE,
  IPC.SCAN_ERROR,
  IPC.FINGERPRINT_PROGRESS,
  IPC.FINGERPRINT_COMPLETE,
  IPC.FINGERPRINT_ERROR,
  IPC.TRAFFIC_PACKET,
  IPC.TRAFFIC_STATS,
  IPC.TRAFFIC_ALERT,
  IPC.TRAFFIC_CREDENTIAL,
  IPC.TRAFFIC_ERROR,
  IPC.PROXY_REQUEST,
  IPC.PROXY_RESPONSE,
  IPC.PROXY_ERROR,
  IPC.AI_ERROR,
  IPC.REPORT_PROGRESS,
  IPC.REPORT_COMPLETE,
  IPC.REPORT_ERROR,
  'dependency:install:progress',
  'dependency:install:done',
  'dependency:install:error',
  // Background AI analysis pushed without an invoke request
  'ai:background-analysis',
]

// ── Expose API to renderer ────────────────────────────────────────────────────

contextBridge.exposeInMainWorld('api', {
  // ── System ────────────────────────────────────────────────────────────────
  checkDependencies: () => ipcRenderer.invoke(IPC.SYSTEM_CHECK_DEPS).then(r => r.deps ?? []),

  getMissingDependencies: () => ipcRenderer.invoke(IPC.SYSTEM_GET_MISSING_DEPS).then(r => r.missing ?? []),

  installDependencies: (tools: string[]) => ipcRenderer.invoke(IPC.SYSTEM_INSTALL_DEPS, { tools }),

  getNetworkInterfaces: () =>
    ipcRenderer.invoke(IPC.SYSTEM_GET_INTERFACES).then(r => r.interfaces ?? []),

  // ── Scan ──────────────────────────────────────────────────────────────────
  startScan: (sessionId: string, options: unknown) =>
    ipcRenderer.invoke(IPC.SCAN_START, { sessionId, options }),

  stopScan: (scanId: string) => ipcRenderer.invoke(IPC.SCAN_STOP, { scanId }),

  // ── Fingerprint ───────────────────────────────────────────────────────────
  startFingerprint: (sessionId: string, options: unknown) =>
    ipcRenderer.invoke(IPC.FINGERPRINT_START, { sessionId, options }),

  // ── Traffic ───────────────────────────────────────────────────────────────
  startCapture: (sessionId: string, iface: string, filter?: string) =>
    ipcRenderer.invoke(IPC.TRAFFIC_START, { sessionId, iface, filter }),

  stopCapture: () => ipcRenderer.invoke(IPC.TRAFFIC_STOP),

  // ── Proxy ─────────────────────────────────────────────────────────────────
  startProxy: (sessionId: string, port?: number) =>
    ipcRenderer.invoke(IPC.PROXY_START, { sessionId, port }),

  stopProxy: () => ipcRenderer.invoke(IPC.PROXY_STOP),

  startARPSpoof: (config: unknown) => ipcRenderer.invoke(IPC.PROXY_ARP_START, { config }),

  stopARPSpoof: () => ipcRenderer.invoke(IPC.PROXY_ARP_STOP),

  replayRequest: (req: unknown, modifications?: unknown) =>
    ipcRenderer.invoke(IPC.PROXY_REPLAY, { req, modifications }),

  // ── AI ────────────────────────────────────────────────────────────────────
  analyzeWithAI: (request: unknown) => ipcRenderer.invoke(IPC.AI_ANALYZE, { request }),

  chatWithAI: (history: unknown, message: string, mode: string) =>
    ipcRenderer.invoke(IPC.AI_CHAT, { history, message, mode }),

  checkAIConfig: () => ipcRenderer.invoke('ai:check-config'),

  // ── SOTA 2026 ─────────────────────────────────────────────────────────────
  checkPqcStatus: (payload: { port: number; serviceName?: string; product?: string; extraInfo?: string }) =>
    ipcRenderer.invoke('sota:pqc-check', payload),

  validatePddl: (payload: { action: string; targetIp: string; gatewayIp?: string }) =>
    ipcRenderer.invoke('sota:pddl-validate', payload),

  runSimulation: (payload: { type: string; targetIp: string }) =>
    ipcRenderer.invoke('sota:run-simulation', payload),

  getAgentAuditLogs: () =>
    ipcRenderer.invoke('sota:get-logs'),

  // ── Reports ───────────────────────────────────────────────────────────────
  generateReport: (options: unknown) => ipcRenderer.invoke(IPC.REPORT_GENERATE, { options }),

  // ── Sessions ──────────────────────────────────────────────────────────────
  createSession: (data: unknown) => ipcRenderer.invoke(IPC.SESSION_CREATE, data),

  listSessions: () => ipcRenderer.invoke(IPC.SESSION_LIST),

  getSession: (id: string) => ipcRenderer.invoke(IPC.SESSION_GET, { id }),

  getSessionDevices: (id: string) => ipcRenderer.invoke(IPC.SESSION_GET_DEVICES, { id }),

  updateSession: (id: string, data: unknown) =>
    ipcRenderer.invoke(IPC.SESSION_UPDATE, { id, data }),

  deleteSession: (id: string) => ipcRenderer.invoke(IPC.SESSION_DELETE, { id }),

  exportSession: (id: string) => ipcRenderer.invoke(IPC.SESSION_EXPORT, { id }),

  // ── Settings ──────────────────────────────────────────────────────────────
  getSetting: (key: string) => ipcRenderer.invoke(IPC.SETTINGS_GET, { key }),

  setSetting: (key: string, value: string) => ipcRenderer.invoke(IPC.SETTINGS_SET, { key, value }),

  // ── Event subscriptions ───────────────────────────────────────────────────
  on: (channel: string, listener: (...args: unknown[]) => void): (() => void) => {
    if (!ALLOWED_RECEIVE_CHANNELS.includes(channel)) {
      console.warn(`[preload] Blocked subscription to unauthorized channel: "${channel}"`)
      return () => {
        /* no-op */
      }
    }
    const wrapped = (_event: Electron.IpcRendererEvent, ...args: unknown[]) => listener(...args)
    ipcRenderer.on(channel, wrapped)
    return () => ipcRenderer.removeListener(channel, wrapped)
  },
})

// ── Global type augmentation ──────────────────────────────────────────────────

declare global {
  interface Window {
    api: import('./api').BlackNetworkAPI
  }
}
