export const IPC = {
  SYSTEM_CHECK_DEPS: 'system:check-deps',
  SYSTEM_GET_MISSING_DEPS: 'system:get-missing-deps',
  SYSTEM_INSTALL_DEPS: 'system:install-deps',
  SYSTEM_GET_INTERFACES: 'system:get-interfaces',
  SCAN_START: 'scan:start',
  SCAN_STOP: 'scan:stop',
  SCAN_DEVICE_FOUND: 'scan:device-found',
  SCAN_PROGRESS: 'scan:progress',
  SCAN_COMPLETE: 'scan:complete',
  SCAN_ERROR: 'scan:error',
  FINGERPRINT_START: 'fingerprint:start',
  FINGERPRINT_PROGRESS: 'fingerprint:progress',
  FINGERPRINT_COMPLETE: 'fingerprint:complete',
  FINGERPRINT_ERROR: 'fingerprint:error',
  TRAFFIC_START: 'traffic:start',
  TRAFFIC_STOP: 'traffic:stop',
  TRAFFIC_PACKET: 'traffic:packet',
  TRAFFIC_STATS: 'traffic:stats',
  TRAFFIC_ALERT: 'traffic:alert',
  TRAFFIC_CREDENTIAL: 'traffic:credential',
  TRAFFIC_ERROR: 'traffic:error',
  PROXY_START: 'proxy:start',
  PROXY_STOP: 'proxy:stop',
  PROXY_ARP_START: 'proxy:arp-start',
  PROXY_ARP_STOP: 'proxy:arp-stop',
  PROXY_REQUEST: 'proxy:request',
  PROXY_RESPONSE: 'proxy:response',
  PROXY_REPLAY: 'proxy:replay',
  PROXY_ERROR: 'proxy:error',
  AI_ANALYZE: 'ai:analyze',
  AI_CHAT: 'ai:chat',
  AI_ERROR: 'ai:error',
  REPORT_GENERATE: 'report:generate',
  REPORT_PROGRESS: 'report:progress',
  REPORT_COMPLETE: 'report:complete',
  REPORT_ERROR: 'report:error',
  SESSION_CREATE: 'session:create',
  SESSION_LIST: 'session:list',
  SESSION_GET: 'session:get',
  SESSION_GET_DEVICES: 'session:get-devices',
  SESSION_UPDATE: 'session:update',
  SESSION_DELETE: 'session:delete',
  SESSION_EXPORT: 'session:export',
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
} as const

export type IPCChannel = (typeof IPC)[keyof typeof IPC]

export interface Session {
  id: string
  name: string
  target?: string
  notes?: string
  riskScore?: number
  createdAt: number
  updatedAt: number
}
