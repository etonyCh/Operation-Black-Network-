import { Database } from '@main/db/database'
import type { Device } from '@shared/types/device.types'

interface DeviceRow {
  id: string
  session_id: string
  ip: string
  mac: string | null
  hostname: string | null
  vendor: string | null
  device_type: string
  status: string
  response_time: number | null
  ports: string | null
  os: string | null
  discovered_at: number
  last_seen: number
}

function rowToDevice(row: DeviceRow): Device {
  return {
    id: row.id,
    sessionId: row.session_id,
    ip: row.ip,
    mac: row.mac ?? undefined,
    hostname: row.hostname ?? undefined,
    vendor: row.vendor ?? undefined,
    deviceType: row.device_type as Device['deviceType'],
    status: row.status as Device['status'],
    responseTime: row.response_time ?? undefined,
    ports: row.ports ? JSON.parse(row.ports) : undefined,
    os: row.os ? JSON.parse(row.os) : undefined,
    discoveredAt: row.discovered_at,
    lastSeen: row.last_seen,
  }
}

export class DeviceRepository {
  private get db() {
    return Database.getInstance().getDb()
  }

  /** Insert-or-update by (session_id, ip). Returns the persisted device. */
  upsert(device: Device): Device {
    const existing = this.db
      .prepare('SELECT id FROM devices WHERE session_id = ? AND ip = ?')
      .get(device.sessionId, device.ip) as { id: string } | undefined

    if (existing) {
      this.db
        .prepare(
          `UPDATE devices SET
             mac = ?, hostname = ?, vendor = ?, device_type = ?, status = ?,
             response_time = ?, ports = ?, os = ?, last_seen = ?
           WHERE id = ?`
        )
        .run(
          device.mac ?? null,
          device.hostname ?? null,
          device.vendor ?? null,
          device.deviceType,
          device.status,
          device.responseTime ?? null,
          device.ports ? JSON.stringify(device.ports) : null,
          device.os ? JSON.stringify(device.os) : null,
          device.lastSeen,
          existing.id
        )
      return this.findById(existing.id)!
    }

    this.db
      .prepare(
        `INSERT INTO devices
           (id, session_id, ip, mac, hostname, vendor, device_type, status,
            response_time, ports, os, discovered_at, last_seen)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        device.id,
        device.sessionId,
        device.ip,
        device.mac ?? null,
        device.hostname ?? null,
        device.vendor ?? null,
        device.deviceType,
        device.status,
        device.responseTime ?? null,
        device.ports ? JSON.stringify(device.ports) : null,
        device.os ? JSON.stringify(device.os) : null,
        device.discoveredAt,
        device.lastSeen
      )
    return device
  }

  findBySessionId(sessionId: string): Device[] {
    const rows = this.db
      .prepare('SELECT * FROM devices WHERE session_id = ? ORDER BY ip')
      .all(sessionId) as DeviceRow[]
    return rows.map(rowToDevice)
  }

  findById(id: string): Device | null {
    const row = this.db.prepare('SELECT * FROM devices WHERE id = ?').get(id) as
      DeviceRow | undefined
    return row ? rowToDevice(row) : null
  }

  update(
    id: string,
    data: Partial<Omit<Device, 'id' | 'sessionId' | 'discoveredAt'>>
  ): Device | null {
    const sets: string[] = ['last_seen = ?']
    const vals: unknown[] = [Date.now()]

    if (data.ports !== undefined) {
      sets.push('ports = ?')
      vals.push(JSON.stringify(data.ports))
    }
    if (data.os !== undefined) {
      sets.push('os = ?')
      vals.push(JSON.stringify(data.os))
    }
    if (data.status !== undefined) {
      sets.push('status = ?')
      vals.push(data.status)
    }
    if (data.hostname !== undefined) {
      sets.push('hostname = ?')
      vals.push(data.hostname)
    }
    if (data.vendor !== undefined) {
      sets.push('vendor = ?')
      vals.push(data.vendor)
    }
    if (data.deviceType !== undefined) {
      sets.push('device_type = ?')
      vals.push(data.deviceType)
    }

    vals.push(id)
    this.db.prepare(`UPDATE devices SET ${sets.join(', ')} WHERE id = ?`).run(...vals)
    return this.findById(id)
  }

  deleteBySessionId(sessionId: string): void {
    this.db.prepare('DELETE FROM devices WHERE session_id = ?').run(sessionId)
  }
}
