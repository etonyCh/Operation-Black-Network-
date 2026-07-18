import { IPC } from '@shared/types/ipc.types'

// Re-export all shared types so the renderer can import them from `window.api`
// without touching Node internals.
export type { Device, Port, OSMatch, DeviceType, DeviceStatus } from '@shared/types/device.types'
export type {
  ScanOptions,
  FingerprintOptions,
  ScanProgress,
  ScanResult,
} from '@shared/types/scan.types'
export type { Vulnerability, Severity, CVSS } from '@shared/types/vulnerability.types'
export type {
  TrafficPacket,
  Credential,
  TrafficAlert,
  TrafficStats,
} from '@shared/types/traffic.types'
export type { ProxyRequest, ProxyResponse, ARPConfig } from '@shared/types/proxy.types'
export type {
  AIAnalysisRequest,
  AIAnalysisResponse,
  AIMode,
  AIMessage,
} from '@shared/types/ai.types'
export type { ReportOptions, ReportResult, ReportSections } from '@shared/types/report.types'
export type { Session, IPCChannel } from '@shared/types/ipc.types'
export { IPC }

// ---------------------------------------------------------------------------
// Auxiliary types used only in the API surface
// ---------------------------------------------------------------------------

export interface DependencyStatus {
  name: string
  command: string
  available: boolean
  version?: string
  required: boolean
}

export interface NetworkInterface {
  name: string
  ip?: string
  mac?: string
  isUp: boolean
}

// ---------------------------------------------------------------------------
// The full typed API exposed on window.api
// ---------------------------------------------------------------------------

import type { ScanOptions, FingerprintOptions } from '@shared/types/scan.types'
import type { ARPConfig, ProxyRequest, ProxyResponse } from '@shared/types/proxy.types'
import type {
  AIAnalysisRequest,
  AIAnalysisResponse,
  AIMessage,
  AIMode,
} from '@shared/types/ai.types'
import type { ReportOptions, ReportResult } from '@shared/types/report.types'
import type { Session } from '@shared/types/ipc.types'

export interface BlackNetworkAPI {
  // ── System ────────────────────────────────────────────────────────────────
  checkDependencies: () => Promise<DependencyStatus[]>
  getMissingDependencies: () => Promise<DependencyStatus[]>
  installDependencies: (tools: string[]) => Promise<{ success: boolean; error?: string }>
  getNetworkInterfaces: () => Promise<NetworkInterface[]>

  // ── Scan ──────────────────────────────────────────────────────────────────
  startScan: (
    sessionId: string,
    options: ScanOptions
  ) => Promise<{ success: boolean; scanId?: string; error?: string }>

  stopScan: (scanId: string) => Promise<{ success: boolean }>

  // ── Fingerprint ───────────────────────────────────────────────────────────
  startFingerprint: (
    sessionId: string,
    options: FingerprintOptions
  ) => Promise<{ success: boolean; fingerprintId?: string; error?: string }>

  // ── Traffic ───────────────────────────────────────────────────────────────
  startCapture: (
    sessionId: string,
    iface: string,
    filter?: string
  ) => Promise<{ success: boolean; error?: string }>

  stopCapture: () => Promise<{ success: boolean }>

  // ── Proxy ─────────────────────────────────────────────────────────────────
  startProxy: (
    sessionId: string,
    port?: number
  ) => Promise<{ success: boolean; proxyPort?: number; error?: string }>

  stopProxy: () => Promise<{ success: boolean }>

  startARPSpoof: (config: ARPConfig) => Promise<{ success: boolean; error?: string }>

  stopARPSpoof: () => Promise<{ success: boolean }>

  replayRequest: (
    req: ProxyRequest,
    modifications?: Partial<ProxyRequest>
  ) => Promise<{ success: boolean; response?: ProxyResponse; error?: string }>

  // ── AI ────────────────────────────────────────────────────────────────────
  analyzeWithAI: (
    request: AIAnalysisRequest
  ) => Promise<{ success: boolean; response?: AIAnalysisResponse; error?: string }>

  chatWithAI: (
    history: AIMessage[],
    message: string,
    mode: AIMode
  ) => Promise<{ success: boolean; response?: AIAnalysisResponse; error?: string }>

  checkAIConfig: () => Promise<boolean>

  // ── SOTA 2026 ─────────────────────────────────────────────────────────────
  checkPqcStatus: (payload: { port: number; serviceName?: string; product?: string; extraInfo?: string }) => Promise<{
    isQuantumReady: boolean
    riskLevel: 'high' | 'medium' | 'low' | 'none'
    algorithmsFound: string[]
    recommendations: string[]
  }>
  validatePddl: (payload: { action: string; targetIp: string; gatewayIp?: string }) => Promise<{
    isValid: boolean
    ruleViolated?: string
    explanations: string
  }>
  runSimulation: (payload: { type: string; targetIp: string }) => Promise<{ success: boolean; message: string }>
  getAgentAuditLogs: () => Promise<{
    id: string
    timestamp: number
    agentId: string
    action: string
    input: string
    output: string
    pddlValid: number
    pddlRule?: string
  }[]>

  // ── Enumeration ───────────────────────────────────────────────────────────
  startDirectoryEnum: (payload: { targetUrl: string; customWordlist?: string[] }) => Promise<{ success: boolean; scanId?: string; error?: string }>
  stopDirectoryEnum: (payload: { scanId: string }) => Promise<{ success: boolean }>
  startDnsEnum: (payload: { domain: string }) => Promise<{ success: boolean; scanId?: string; error?: string }>
  stopDnsEnum: (payload: { scanId: string }) => Promise<{ success: boolean }>

  // ── Reports ───────────────────────────────────────────────────────────────
  generateReport: (options: ReportOptions) => Promise<ReportResult>

  // ── Sessions ──────────────────────────────────────────────────────────────
  createSession: (data: {
    name: string
    target?: string
    notes?: string
  }) => Promise<{ success: boolean; session?: Session; error?: string }>

  listSessions: () => Promise<{ success: boolean; sessions?: Session[]; error?: string }>

  getSession: (id: string) => Promise<{
    success: boolean
    session?: Session & { deviceCount: number; vulnCount: number; riskScore: number }
    error?: string
  }>

  updateSession: (
    id: string,
    data: Partial<Session>
  ) => Promise<{ success: boolean; session?: Session; error?: string }>

  deleteSession: (id: string) => Promise<{ success: boolean; error?: string }>

  exportSession: (id: string) => Promise<{ success: boolean; path?: string; error?: string }>

  // ── Settings ──────────────────────────────────────────────────────────────
  getSetting: (key: string) => Promise<{ success: boolean; value?: string | null; error?: string }>

  setSetting: (key: string, value: string) => Promise<{ success: boolean; error?: string }>

  // ── Event subscriptions ───────────────────────────────────────────────────
  /**
   * Subscribe to a push event from the main process.
   * Returns an unsubscribe function — call it to remove the listener.
   */
  on: (channel: string, listener: (...args: unknown[]) => void) => () => void
}
