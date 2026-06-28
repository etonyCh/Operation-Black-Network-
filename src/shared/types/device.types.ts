export type DeviceType =
  | 'router'
  | 'switch'
  | 'server'
  | 'workstation'
  | 'mobile'
  | 'iot'
  | 'printer'
  | 'camera'
  | 'unknown'

export type DeviceStatus = 'online' | 'offline' | 'filtered'

export interface Port {
  port: number
  protocol: 'tcp' | 'udp'
  state: 'open' | 'closed' | 'filtered'
  service?: string
  product?: string
  version?: string
  extraInfo?: string
  cpe?: string[]
}

export interface OSMatch {
  name: string
  accuracy: number
  family?: string
  vendor?: string
  generation?: string
  type?: string
  cpe?: string[]
}

export interface Device {
  id: string
  sessionId: string
  ip: string
  mac?: string
  hostname?: string
  vendor?: string
  deviceType: DeviceType
  status: DeviceStatus
  responseTime?: number
  ports?: Port[]
  os?: OSMatch
  discoveredAt: number
  lastSeen: number
}
