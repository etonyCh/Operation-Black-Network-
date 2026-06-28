import { Database } from '@main/db/database'
import type { TrafficPacket, Credential, TrafficAlert } from '@shared/types/traffic.types'

export class TrafficRepository {
  private get db() {
    return Database.getInstance().getDb()
  }

  savePacket(packet: TrafficPacket): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO traffic_packets
           (id, session_id, timestamp, src_ip, dst_ip, src_port, dst_port, protocol, length, info, raw_hex)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        packet.id,
        packet.sessionId,
        packet.timestamp,
        packet.srcIp,
        packet.dstIp,
        packet.srcPort ?? null,
        packet.dstPort ?? null,
        packet.protocol,
        packet.length,
        packet.info ?? null,
        packet.rawHex ?? null
      )
  }

  saveCredential(cred: Credential): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO credentials
           (id, session_id, timestamp, protocol, src_ip, dst_ip, port, username, password, hash, type)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        cred.id,
        cred.sessionId,
        cred.timestamp,
        cred.protocol,
        cred.srcIp,
        cred.dstIp,
        cred.port,
        cred.username ?? null,
        cred.password ?? null,
        cred.hash ?? null,
        cred.type
      )
  }

  saveAlert(alert: TrafficAlert): void {
    this.db
      .prepare(
        `INSERT OR IGNORE INTO traffic_alerts
           (id, session_id, timestamp, type, severity, description, src_ip, dst_ip, related_packet_ids)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        alert.id,
        alert.sessionId,
        alert.timestamp,
        alert.type,
        alert.severity,
        alert.description,
        alert.srcIp ?? null,
        alert.dstIp ?? null,
        alert.relatedPacketIds ? JSON.stringify(alert.relatedPacketIds) : null
      )
  }

  findPacketsBySessionId(sessionId: string, limit = 2000): TrafficPacket[] {
    return (
      this.db
        .prepare(
          'SELECT * FROM traffic_packets WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?'
        )
        .all(sessionId, limit) as any[]
    ).map(r => ({
      id: r.id,
      sessionId: r.session_id,
      timestamp: r.timestamp,
      srcIp: r.src_ip,
      dstIp: r.dst_ip,
      srcPort: r.src_port ?? undefined,
      dstPort: r.dst_port ?? undefined,
      protocol: r.protocol,
      length: r.length,
      info: r.info ?? undefined,
      rawHex: r.raw_hex ?? undefined,
    }))
  }

  findCredentialsBySessionId(sessionId: string): Credential[] {
    return (
      this.db
        .prepare('SELECT * FROM credentials WHERE session_id = ? ORDER BY timestamp DESC')
        .all(sessionId) as any[]
    ).map(r => ({
      id: r.id,
      sessionId: r.session_id,
      timestamp: r.timestamp,
      protocol: r.protocol,
      srcIp: r.src_ip,
      dstIp: r.dst_ip,
      port: r.port,
      username: r.username ?? undefined,
      password: r.password ?? undefined,
      hash: r.hash ?? undefined,
      type: r.type,
    }))
  }

  findAlertsBySessionId(sessionId: string): TrafficAlert[] {
    return (
      this.db
        .prepare('SELECT * FROM traffic_alerts WHERE session_id = ? ORDER BY timestamp DESC')
        .all(sessionId) as any[]
    ).map(r => ({
      id: r.id,
      sessionId: r.session_id,
      timestamp: r.timestamp,
      type: r.type,
      severity: r.severity,
      description: r.description,
      srcIp: r.src_ip ?? undefined,
      dstIp: r.dst_ip ?? undefined,
      relatedPacketIds: r.related_packet_ids ? JSON.parse(r.related_packet_ids) : undefined,
    }))
  }

  deleteBySessionId(sessionId: string): void {
    const del = this.db.transaction(() => {
      this.db.prepare('DELETE FROM traffic_packets WHERE session_id = ?').run(sessionId)
      this.db.prepare('DELETE FROM credentials WHERE session_id = ?').run(sessionId)
      this.db.prepare('DELETE FROM traffic_alerts WHERE session_id = ?').run(sessionId)
    })
    del()
  }
}
