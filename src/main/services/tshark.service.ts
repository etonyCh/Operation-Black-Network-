import { EventEmitter } from 'events'
import { spawn, ChildProcess } from 'child_process'
import { logger } from '@main/utils/logger'
import type {
  TrafficPacket,
  Credential,
  TrafficAlert,
  TrafficStats,
} from '@shared/types/traffic.types'

export interface CaptureEmitter extends EventEmitter {
  on(event: 'packet', listener: (pkt: TrafficPacket) => void): this
  on(event: 'credential', listener: (cred: Credential) => void): this
  on(event: 'alert', listener: (alert: TrafficAlert) => void): this
  on(event: 'stats', listener: (stats: TrafficStats) => void): this
  on(event: 'error', listener: (err: Error) => void): this
}

// Tshark EK fields we care about
interface EKPacket {
  timestamp: number
  layers: {
    frame?: { 'frame-len'?: number[]; 'frame-time_epoch'?: string[] }
    ip?: { 'ip-src'?: string[]; 'ip-dst'?: string[] }
    ipv6?: { 'ipv6-src'?: string[]; 'ipv6-dst'?: string[] }
    tcp?: { 'tcp-srcport'?: string[]; 'tcp-dstport'?: string[]; 'tcp-payload'?: string[] }
    udp?: { 'udp-srcport'?: string[]; 'udp-dstport'?: string[] }
    http?: {
      'http-request-method'?: string[]
      'http-host'?: string[]
      'http-authorization'?: string[]
      'http-request-full_uri'?: string[]
      'http-file-data'?: string[]
    }
    ftp?: { 'ftp-request-command'?: string[]; 'ftp-request-arg'?: string[] }
    _ws_col_info?: string[]
    frame_protocols?: string[]
  }
}

function first<T>(arr: T[] | undefined): T | undefined {
  return arr?.[0]
}

class TsharkService {
  private captureProcess: ChildProcess | null = null
  private statsInterval: NodeJS.Timeout | null = null
  private statsData = {
    totalPackets: 0,
    totalBytes: 0,
    protocols: new Map<string, number>(),
    hosts: new Map<string, number>(),
  }
  private statsIntervalMs = 3000
  private currentSessionId = ''

  startCapture(sessionId: string, iface: string, filter?: string): CaptureEmitter {
    if (this.captureProcess) {
      this.stopCapture()
    }

    const emitter = new EventEmitter() as CaptureEmitter
    this.currentSessionId = sessionId
    this.statsData = { totalPackets: 0, totalBytes: 0, protocols: new Map(), hosts: new Map() }

    const args = [
      '-i',
      iface,
      '-T',
      'ek', // Elasticsearch/JSONL output
      '-l', // line-buffered
      '-e',
      'frame.len',
      '-e',
      'frame.time_epoch',
      '-e',
      'ip.src',
      '-e',
      'ip.dst',
      '-e',
      'ipv6.src',
      '-e',
      'ipv6.dst',
      '-e',
      'tcp.srcport',
      '-e',
      'tcp.dstport',
      '-e',
      'udp.srcport',
      '-e',
      'udp.dstport',
      '-e',
      'http.request.method',
      '-e',
      'http.host',
      '-e',
      'http.authorization',
      '-e',
      'http.request.full_uri',
      '-e',
      'ftp.request.command',
      '-e',
      'ftp.request.arg',
      '-e',
      '_ws.col.Info',
      '-e',
      'frame.protocols',
    ]

    if (filter) args.push('-f', filter)

    logger.info(`[tshark] starting capture on ${iface}`)
    const child = spawn('tshark', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    this.captureProcess = child

    let lineBuffer = ''
    child.stdout?.on('data', (chunk: Buffer) => {
      lineBuffer += chunk.toString()
      const lines = lineBuffer.split('\n')
      lineBuffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.trim().startsWith('{')) {
          this.processLine(line, sessionId, emitter)
        }
      }
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      const msg = chunk.toString().trim()
      if (msg) logger.debug(`[tshark] ${msg}`)
    })

    child.on('error', err => {
      emitter.emit('error', err)
    })

    child.on('close', code => {
      this.captureProcess = null
      if (code !== 0 && code !== null) {
        emitter.emit('error', new Error(`tshark exited with code ${code}`))
      }
    })

    // Periodic stats
    this.statsInterval = setInterval(() => {
      const now = Date.now()
      const topProtocols = Array.from(this.statsData.protocols.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([protocol, count]) => ({ protocol, count }))
      const topHosts = Array.from(this.statsData.hosts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([ip, bytes]) => ({ ip, bytes }))

      const stats: TrafficStats = {
        sessionId,
        timestamp: now,
        totalPackets: this.statsData.totalPackets,
        totalBytes: this.statsData.totalBytes,
        packetsPerSecond: Math.round(this.statsData.totalPackets / (this.statsIntervalMs / 1000)),
        bytesPerSecond: Math.round(this.statsData.totalBytes / (this.statsIntervalMs / 1000)),
        topProtocols,
        topHosts,
      }
      emitter.emit('stats', stats)
    }, this.statsIntervalMs)

    return emitter
  }

  stopCapture(): void {
    if (this.statsInterval) {
      clearInterval(this.statsInterval)
      this.statsInterval = null
    }
    if (this.captureProcess) {
      this.captureProcess.kill('SIGTERM')
      this.captureProcess = null
    }
    logger.info('[tshark] capture stopped')
  }

  private processLine(line: string, sessionId: string, emitter: CaptureEmitter): void {
    try {
      const ek = JSON.parse(line) as EKPacket
      if (!ek.layers) return

      const layers = ek.layers
      const srcIp = first(layers.ip?.['ip-src']) ?? first(layers.ipv6?.['ipv6-src']) ?? ''
      const dstIp = first(layers.ip?.['ip-dst']) ?? first(layers.ipv6?.['ipv6-dst']) ?? ''
      if (!srcIp || !dstIp) return

      const srcPort = first(layers.tcp?.['tcp-srcport'])
        ? parseInt(first(layers.tcp!['tcp-srcport'])!, 10)
        : first(layers.udp?.['udp-srcport'])
          ? parseInt(first(layers.udp!['udp-srcport'])!, 10)
          : undefined
      const dstPort = first(layers.tcp?.['tcp-dstport'])
        ? parseInt(first(layers.tcp!['tcp-dstport'])!, 10)
        : first(layers.udp?.['udp-dstport'])
          ? parseInt(first(layers.udp!['udp-dstport'])!, 10)
          : undefined

      const tsEpoch = first(layers.frame?.['frame-time_epoch'])
      const timestamp = tsEpoch ? Math.round(parseFloat(tsEpoch) * 1000) : Date.now()
      const frameLen = first(layers.frame?.['frame-len']) ?? 0
      const protocols = first(layers.frame_protocols as unknown as string[]) ?? 'unknown'
      const topProto = protocols.split(':').pop() ?? protocols

      const packet: TrafficPacket = {
        id: crypto.randomUUID(),
        sessionId,
        timestamp,
        srcIp,
        dstIp,
        srcPort,
        dstPort,
        protocol: topProto.toUpperCase(),
        length: typeof frameLen === 'number' ? frameLen : parseInt(String(frameLen), 10),
        info: first(layers['_ws_col_info'] as unknown as string[]),
      }

      emitter.emit('packet', packet)
      this.updateStats(topProto, srcIp, dstIp, packet.length)

      // Credential detection
      this.detectCredentials(layers, srcIp, dstIp, dstPort, sessionId, emitter)
    } catch {
      // Malformed JSON — skip
    }
  }

  private updateStats(protocol: string, srcIp: string, dstIp: string, bytes: number): void {
    this.statsData.totalPackets++
    this.statsData.totalBytes += bytes
    this.statsData.protocols.set(protocol, (this.statsData.protocols.get(protocol) ?? 0) + 1)
    this.statsData.hosts.set(srcIp, (this.statsData.hosts.get(srcIp) ?? 0) + bytes)
    this.statsData.hosts.set(dstIp, (this.statsData.hosts.get(dstIp) ?? 0) + bytes)
  }

  private detectCredentials(
    layers: EKPacket['layers'],
    srcIp: string,
    dstIp: string,
    dstPort: number | undefined,
    sessionId: string,
    emitter: CaptureEmitter
  ): void {
    // HTTP Basic Auth
    const authHeader = first(layers.http?.['http-authorization'])
    if (authHeader) {
      const basicMatch = authHeader.match(/^Basic\s+(.+)$/i)
      if (basicMatch) {
        const decoded = Buffer.from(basicMatch[1], 'base64').toString('utf-8')
        const [username, ...passParts] = decoded.split(':')
        const cred: Credential = {
          id: crypto.randomUUID(),
          sessionId,
          timestamp: Date.now(),
          protocol: 'HTTP',
          srcIp,
          dstIp,
          port: dstPort ?? 80,
          username,
          password: passParts.join(':'),
          type: 'plaintext',
        }
        emitter.emit('credential', cred)

        const alert: TrafficAlert = {
          id: crypto.randomUUID(),
          sessionId,
          timestamp: Date.now(),
          type: 'CLEARTEXT_CREDENTIALS',
          severity: 'high',
          description: `HTTP Basic Auth credentials captured from ${srcIp} to ${dstIp}`,
          srcIp,
          dstIp,
        }
        emitter.emit('alert', alert)
      }
    }

    // FTP credentials
    const ftpCmd = first(layers.ftp?.['ftp-request-command'])
    const ftpArg = first(layers.ftp?.['ftp-request-arg'])
    if (ftpCmd?.toUpperCase() === 'USER' && ftpArg) {
      const cred: Credential = {
        id: crypto.randomUUID(),
        sessionId,
        timestamp: Date.now(),
        protocol: 'FTP',
        srcIp,
        dstIp,
        port: dstPort ?? 21,
        username: ftpArg,
        type: 'plaintext',
      }
      emitter.emit('credential', cred)
    }
    if (ftpCmd?.toUpperCase() === 'PASS' && ftpArg) {
      // Emitting a password-only credential; a real implementation would correlate USER+PASS
      const cred: Credential = {
        id: crypto.randomUUID(),
        sessionId,
        timestamp: Date.now(),
        protocol: 'FTP',
        srcIp,
        dstIp,
        port: dstPort ?? 21,
        password: ftpArg,
        type: 'plaintext',
      }
      emitter.emit('credential', cred)
    }
  }
}

export const tsharkService = new TsharkService()
