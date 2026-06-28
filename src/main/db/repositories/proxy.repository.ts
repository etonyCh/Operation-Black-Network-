import { Database } from '@main/db/database'
import type { ProxyRequest, ProxyResponse } from '@shared/types/proxy.types'

export class ProxyRepository {
  private get db() {
    return Database.getInstance().getDb()
  }

  saveRequest(req: ProxyRequest): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO proxy_requests
           (id, session_id, timestamp, method, url, host, path, http_version, headers, body, content_type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        req.id,
        req.sessionId,
        req.timestamp,
        req.method,
        req.url,
        req.host,
        req.path,
        req.httpVersion,
        JSON.stringify(req.headers),
        req.body ?? null,
        req.contentType ?? null
      )
  }

  saveResponse(resp: ProxyResponse): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO proxy_responses
           (id, request_id, session_id, timestamp, status_code, status_message,
            headers, body, content_type, size, duration)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        resp.id,
        resp.requestId,
        resp.sessionId,
        resp.timestamp,
        resp.statusCode,
        resp.statusMessage,
        JSON.stringify(resp.headers),
        resp.body ?? null,
        resp.contentType ?? null,
        resp.size,
        resp.duration
      )
  }

  findRequestsBySessionId(sessionId: string): ProxyRequest[] {
    return (
      this.db
        .prepare('SELECT * FROM proxy_requests WHERE session_id = ? ORDER BY timestamp DESC')
        .all(sessionId) as any[]
    ).map(r => ({
      id: r.id,
      sessionId: r.session_id,
      timestamp: r.timestamp,
      method: r.method,
      url: r.url,
      host: r.host,
      path: r.path,
      httpVersion: r.http_version,
      headers: JSON.parse(r.headers),
      body: r.body ?? undefined,
      contentType: r.content_type ?? undefined,
    }))
  }

  findResponsesBySessionId(sessionId: string): ProxyResponse[] {
    return (
      this.db
        .prepare('SELECT * FROM proxy_responses WHERE session_id = ? ORDER BY timestamp DESC')
        .all(sessionId) as any[]
    ).map(r => ({
      id: r.id,
      requestId: r.request_id,
      sessionId: r.session_id,
      timestamp: r.timestamp,
      statusCode: r.status_code,
      statusMessage: r.status_message,
      headers: JSON.parse(r.headers),
      body: r.body ?? undefined,
      contentType: r.content_type ?? undefined,
      size: r.size,
      duration: r.duration,
    }))
  }

  findResponseForRequest(requestId: string): ProxyResponse | null {
    const r = this.db
      .prepare('SELECT * FROM proxy_responses WHERE request_id = ?')
      .get(requestId) as any | undefined
    if (!r) return null
    return {
      id: r.id,
      requestId: r.request_id,
      sessionId: r.session_id,
      timestamp: r.timestamp,
      statusCode: r.status_code,
      statusMessage: r.status_message,
      headers: JSON.parse(r.headers),
      body: r.body ?? undefined,
      contentType: r.content_type ?? undefined,
      size: r.size,
      duration: r.duration,
    }
  }

  deleteBySessionId(sessionId: string): void {
    const del = this.db.transaction(() => {
      this.db.prepare('DELETE FROM proxy_requests WHERE session_id = ?').run(sessionId)
      this.db.prepare('DELETE FROM proxy_responses WHERE session_id = ?').run(sessionId)
    })
    del()
  }
}
