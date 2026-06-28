import type { Device } from './device.types'

export interface ScanOptions {
  target: string
  interface?: string
  mode: 'quick' | 'normal' | 'aggressive'
  ports?: string
  timeout?: number
}

export interface FingerprintOptions {
  deviceId: string
  ip: string
  checkVulns: boolean
  timeout?: number
}

export interface ScanProgress {
  phase: string
  percent: number
  hostsTotal?: number
  hostsScanned?: number
  eta?: number
}

export interface ScanResult {
  scanId: string
  sessionId: string
  devices: Device[]
  startTime: number
  endTime: number
  totalHosts: number
  aliveHosts: number
}
