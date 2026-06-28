import { EventEmitter } from 'events'
import { spawn, ChildProcess } from 'child_process'
import { writeFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { request as httpRequest, RequestOptions } from 'http'
import { request as httpsRequest } from 'https'
import { URL } from 'url'
import { logger } from '@main/utils/logger'
import type { ProxyRequest, ProxyResponse } from '@shared/types/proxy.types'

export interface ProxyEmitter extends EventEmitter {
  on(event: 'request', listener: (req: ProxyRequest) => void): this
  on(event: 'response', listener: (resp: ProxyResponse) => void): this
  on(event: 'error', listener: (err: Error) => void): this
}

// Python addon script written to a temp file; mitmdump loads it.
const ADDON_SCRIPT = `
import json, sys, time
from mitmproxy import http

def request(flow: http.HTTPFlow) -> None:
    try:
        body = flow.request.content.decode("utf-8", errors="replace") if flow.request.content else None
        data = {
            "event": "request",
            "id": flow.id,
            "timestamp": time.time(),
            "method": flow.request.method,
            "url": str(flow.request.pretty_url),
            "host": flow.request.host,
            "path": flow.request.path,
            "httpVersion": flow.request.http_version,
            "headers": dict(flow.request.headers),
            "body": body,
            "contentType": flow.request.headers.get("content-type"),
        }
        print(json.dumps(data), flush=True)
    except Exception as e:
        sys.stderr.write(f"addon request error: {e}\\n")

def response(flow: http.HTTPFlow) -> None:
    if not flow.response:
        return
    try:
        body = flow.response.content.decode("utf-8", errors="replace") if flow.response.content else None
        data = {
            "event": "response",
            "id": flow.id + "_r",
            "requestId": flow.id,
            "timestamp": time.time(),
            "statusCode": flow.response.status_code,
            "statusMessage": flow.response.reason,
            "headers": dict(flow.response.headers),
            "body": body,
            "contentType": flow.response.headers.get("content-type"),
            "size": len(flow.response.content) if flow.response.content else 0,
            "duration": (flow.response.timestamp_end - flow.request.timestamp_end) * 1000 if flow.response.timestamp_end else 0,
        }
        print(json.dumps(data), flush=True)
    except Exception as e:
        sys.stderr.write(f"addon response error: {e}\\n")
`

class MitmproxyService {
  private process: ChildProcess | null = null
  private addonPath: string | null = null
  private currentSessionId = ''
  private currentPort = 8080

  get proxyPort(): number {
    return this.currentPort
  }

  start(sessionId: string, port = 8080): ProxyEmitter {
    if (this.process) this.stop()

    const emitter = new EventEmitter() as ProxyEmitter
    this.currentSessionId = sessionId
    this.currentPort = port

    // Write addon script to temp file
    this.addonPath = join(tmpdir(), `black-network_addon_${Date.now()}.py`)
    writeFileSync(this.addonPath, ADDON_SCRIPT, 'utf-8')

    const args = [
      '--listen-port', String(port),
      '--quiet',
      '-s', this.addonPath,
    ]

    logger.info(`[mitmproxy] starting mitmdump on port ${port}`)
    const child = spawn('mitmdump', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    this.process = child

    let lineBuffer = ''
    child.stdout?.on('data', (chunk: Buffer) => {
      lineBuffer += chunk.toString()
      const lines = lineBuffer.split('\n')
      lineBuffer = lines.pop() ?? ''
      for (const line of lines) {
        if (line.trim().startsWith('{')) {
          this.processEvent(line, sessionId, emitter)
        }
      }
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      logger.debug(`[mitmproxy] ${chunk.toString().trim()}`)
    })

    child.on('error', (err) => {
      emitter.emit('error', err)
    })

    child.on('close', (code) => {
      this.process = null
      this.cleanupAddon()
      if (code !== 0 && code !== null) {
        logger.warn(`[mitmproxy] exited with code ${code}`)
      }
    })

    return emitter
  }

  stop(): void {
    if (this.process) {
      this.process.kill('SIGTERM')
      this.process = null
    }
    this.cleanupAddon()
    logger.info('[mitmproxy] stopped')
  }

  /** Replay a captured request with optional field overrides. */
  replayRequest(req: ProxyRequest, modifications?: Partial<ProxyRequest>): Promise<ProxyResponse> {
    return new Promise((resolve, reject) => {
      const merged: ProxyRequest = { ...req, ...modifications }
      const parsed = new URL(merged.url)

      const opts: RequestOptions = {
        hostname: parsed.hostname,
        port: parsed.port ? parseInt(parsed.port, 10) : (parsed.protocol === 'https:' ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: merged.method,
        headers: merged.headers,
      }

      const transport = parsed.protocol === 'https:' ? httpsRequest : httpRequest
      const startTime = Date.now()

      const outReq = transport(opts, (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => {
          const body = Buffer.concat(chunks)
          const duration = Date.now() - startTime
          const response: ProxyResponse = {
            id: crypto.randomUUID(),
            requestId: req.id,
            sessionId: req.sessionId,
            timestamp: Date.now(),
            statusCode: res.statusCode ?? 0,
            statusMessage: res.statusMessage ?? '',
            headers: Object.fromEntries(
              Object.entries(res.headers).map(([k, v]) => [k, Array.isArray(v) ? v.join(', ') : (v ?? '')])
            ),
            body: body.toString('utf-8'),
            contentType: res.headers['content-type'],
            size: body.length,
            duration,
          }
          resolve(response)
        })
      })

      outReq.on('error', reject)
      if (merged.body) outReq.write(merged.body)
      outReq.end()
    })
  }

  private processEvent(line: string, sessionId: string, emitter: ProxyEmitter): void {
    try {
      const ev = JSON.parse(line) as Record<string, any>
      if (ev['event'] === 'request') {
        const req: ProxyRequest = {
          id: ev['id'],
          sessionId,
          timestamp: Math.round((ev['timestamp'] as number) * 1000),
          method: ev['method'],
          url: ev['url'],
          host: ev['host'],
          path: ev['path'],
          httpVersion: ev['httpVersion'] ?? 'HTTP/1.1',
          headers: ev['headers'] ?? {},
          body: ev['body'] ?? undefined,
          contentType: ev['contentType'] ?? undefined,
        }
        emitter.emit('request', req)
      } else if (ev['event'] === 'response') {
        const resp: ProxyResponse = {
          id: ev['id'],
          requestId: ev['requestId'],
          sessionId,
          timestamp: Math.round((ev['timestamp'] as number) * 1000),
          statusCode: ev['statusCode'],
          statusMessage: ev['statusMessage'] ?? '',
          headers: ev['headers'] ?? {},
          body: ev['body'] ?? undefined,
          contentType: ev['contentType'] ?? undefined,
          size: ev['size'] ?? 0,
          duration: Math.round(ev['duration'] ?? 0),
        }
        emitter.emit('response', resp)
      }
    } catch {
      // Skip malformed JSON
    }
  }

  private cleanupAddon(): void {
    if (this.addonPath) {
      try { unlinkSync(this.addonPath) } catch { /* ignore */ }
      this.addonPath = null
    }
  }
}

export const mitmproxyService = new MitmproxyService()
