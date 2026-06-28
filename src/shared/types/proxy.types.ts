export interface ProxyRequest {
  id: string
  sessionId: string
  timestamp: number
  method: string
  url: string
  host: string
  path: string
  httpVersion: string
  headers: Record<string, string>
  body?: string
  contentType?: string
}

export interface ProxyResponse {
  id: string
  requestId: string
  sessionId: string
  timestamp: number
  statusCode: number
  statusMessage: string
  headers: Record<string, string>
  body?: string
  contentType?: string
  size: number
  duration: number
}

export interface ARPConfig {
  targetIp: string
  gatewayIp: string
  interface: string
}
