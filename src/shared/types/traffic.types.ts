export interface TrafficPacket {
  id: string
  sessionId: string
  timestamp: number
  srcIp: string
  dstIp: string
  srcPort?: number
  dstPort?: number
  protocol: string
  length: number
  info?: string
  rawHex?: string
}

export interface Credential {
  id: string
  sessionId: string
  timestamp: number
  protocol: string
  srcIp: string
  dstIp: string
  port: number
  username?: string
  password?: string
  hash?: string
  type: 'plaintext' | 'hash' | 'cookie' | 'token'
}

export interface TrafficAlert {
  id: string
  sessionId: string
  timestamp: number
  type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  srcIp?: string
  dstIp?: string
  relatedPacketIds?: string[]
}

export interface TrafficStats {
  sessionId: string
  timestamp: number
  totalPackets: number
  totalBytes: number
  packetsPerSecond: number
  bytesPerSecond: number
  topProtocols: { protocol: string; count: number }[]
  topHosts: { ip: string; bytes: number }[]
}
