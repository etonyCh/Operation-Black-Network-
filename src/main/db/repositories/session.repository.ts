import { Database } from '@main/db/database'
import * as crypto from 'crypto'
import type { Session } from '@shared/types/ipc.types'

interface SessionRow {
  id: string
  name: string
  target: string | null
  notes: string | null
  risk_score: number | null
  created_at: number
  updated_at: number
}

function rowToSession(row: SessionRow): Session {
  return {
    id: row.id,
    name: row.name,
    target: row.target ?? undefined,
    notes: row.notes ?? undefined,
    riskScore: row.risk_score ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export class SessionRepository {
  private get db() {
    return Database.getInstance().getDb()
  }

  create(data: { name: string; target?: string; notes?: string }): Session {
    const id = crypto.randomUUID()
    const now = Date.now()
    this.db
      .prepare(
        `INSERT INTO sessions (id, name, target, notes, risk_score, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, ?, ?)`
      )
      .run(id, data.name, data.target ?? null, data.notes ?? null, now, now)
    return this.findById(id)!
  }

  findAll(): Session[] {
    const rows = this.db
      .prepare('SELECT * FROM sessions ORDER BY created_at DESC')
      .all() as SessionRow[]
    return rows.map(rowToSession)
  }

  findById(id: string): Session | null {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as
      SessionRow | undefined
    return row ? rowToSession(row) : null
  }

  update(
    id: string,
    data: Partial<Pick<Session, 'name' | 'target' | 'notes' | 'riskScore'>>
  ): Session | null {
    const sets: string[] = ['updated_at = ?']
    const vals: unknown[] = [Date.now()]

    if (data.name !== undefined) {
      sets.push('name = ?')
      vals.push(data.name)
    }
    if (data.target !== undefined) {
      sets.push('target = ?')
      vals.push(data.target)
    }
    if (data.notes !== undefined) {
      sets.push('notes = ?')
      vals.push(data.notes)
    }
    if (data.riskScore !== undefined) {
      sets.push('risk_score = ?')
      vals.push(data.riskScore)
    }

    vals.push(id)
    this.db.prepare(`UPDATE sessions SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
    return this.findById(id)
  }

  delete(id: string): boolean {
    const result = this.db.prepare('DELETE FROM sessions WHERE id = ?').run(id)
    return result.changes > 0
  }

  // ---- settings table (lives here for simplicity) ----

  getSetting(key: string): string | null {
    const row = this.db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
      { value: string } | undefined
    return row?.value ?? null
  }

  setSetting(key: string, value: string): void {
    this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value)
  }

  // ---- aggregate helpers ----

  getDeviceCount(sessionId: string): number {
    const row = this.db
      .prepare('SELECT COUNT(*) AS c FROM devices WHERE session_id = ?')
      .get(sessionId) as { c: number }
    return row.c
  }

  getVulnCount(sessionId: string): number {
    const row = this.db
      .prepare('SELECT COUNT(*) AS c FROM vulnerabilities WHERE session_id = ?')
      .get(sessionId) as { c: number }
    return row.c
  }

  getMaxRiskScore(sessionId: string): number {
    const row = this.db
      .prepare(
        `SELECT MAX(
        CASE severity
          WHEN 'critical' THEN 10
          WHEN 'high'     THEN 7
          WHEN 'medium'   THEN 5
          WHEN 'low'      THEN 3
          ELSE 1
        END
      ) AS score FROM vulnerabilities WHERE session_id = ?`
      )
      .get(sessionId) as { score: number | null }
    return row.score ?? 0
  }
}
