import { IpcMain, app } from 'electron'
import { join } from 'path'
import { writeFile } from 'fs/promises'
import { mkdirSync } from 'fs'
import { SessionRepository } from '@main/db/repositories/session.repository'
import { DeviceRepository } from '@main/db/repositories/device.repository'
import { VulnerabilityRepository } from '@main/db/repositories/vulnerability.repository'
import { TrafficRepository } from '@main/db/repositories/traffic.repository'
import { ProxyRepository } from '@main/db/repositories/proxy.repository'
import { aiService } from '@main/services/ai.service'
import { IPC } from '@shared/types/ipc.types'
import type { Session } from '@shared/types/ipc.types'
import { logger } from '@main/utils/logger'

export function registerSessionHandlers(ipcMain: IpcMain): void {
  const sessionRepo = new SessionRepository()
  const deviceRepo = new DeviceRepository()
  const vulnRepo = new VulnerabilityRepository()
  const trafficRepo = new TrafficRepository()
  const proxyRepo = new ProxyRepository()

  // ── create ───────────────────────────────────────────────────────────────────
  ipcMain.handle(
    IPC.SESSION_CREATE,
    async (_event, data: { name: string; target?: string; notes?: string }) => {
      try {
        const session = sessionRepo.create(data)
        return { success: true, session }
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  )

  // ── list ─────────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.SESSION_LIST, async () => {
    try {
      const sessions = sessionRepo.findAll()
      return { success: true, sessions }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  // ── get (with summary stats) ─────────────────────────────────────────────────
  ipcMain.handle(IPC.SESSION_GET, async (_event, payload: { id: string }) => {
    try {
      const session = sessionRepo.findById(payload.id)
      if (!session) return { success: false, error: 'Session not found' }

      const deviceCount = sessionRepo.getDeviceCount(payload.id)
      const vulnCount = sessionRepo.getVulnCount(payload.id)
      const riskScore = sessionRepo.getMaxRiskScore(payload.id)

      return { success: true, session: { ...session, deviceCount, vulnCount, riskScore } }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  // ── update ───────────────────────────────────────────────────────────────────
  ipcMain.handle(
    IPC.SESSION_UPDATE,
    async (_event, payload: { id: string; data: Partial<Session> }) => {
      try {
        const updated = sessionRepo.update(payload.id, payload.data)
        if (!updated) return { success: false, error: 'Session not found' }
        return { success: true, session: updated }
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) }
      }
    }
  )

  // ── delete (cascades to all related data) ────────────────────────────────────
  ipcMain.handle(IPC.SESSION_DELETE, async (_event, payload: { id: string }) => {
    try {
      // SQLite ON DELETE CASCADE handles related rows automatically
      const deleted = sessionRepo.delete(payload.id)
      return { success: deleted }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  // ── export to JSON (.netsent) ─────────────────────────────────────────────────
  ipcMain.handle(IPC.SESSION_EXPORT, async (_event, payload: { id: string }) => {
    try {
      const session = sessionRepo.findById(payload.id)
      if (!session) return { success: false, error: 'Session not found' }

      const exportData = {
        version: '1.0',
        exportedAt: Date.now(),
        session,
        devices: deviceRepo.findBySessionId(payload.id),
        vulnerabilities: vulnRepo.findBySessionId(payload.id),
        trafficPackets: trafficRepo.findPacketsBySessionId(payload.id),
        credentials: trafficRepo.findCredentialsBySessionId(payload.id),
        alerts: trafficRepo.findAlertsBySessionId(payload.id),
        proxyRequests: proxyRepo.findRequestsBySessionId(payload.id),
        proxyResponses: proxyRepo.findResponsesBySessionId(payload.id),
      }

      const docsDir = join(app.getPath('documents'), 'Black Network Exports')
      mkdirSync(docsDir, { recursive: true })

      const safeName = session.name.replace(/[^a-z0-9_-]/gi, '_')
      const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const filePath = join(docsDir, `${safeName}_${ts}.netsent`)

      await writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf-8')
      logger.info(`[session] exported ${payload.id} to ${filePath}`)
      return { success: true, path: filePath }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error(`[session] export failed: ${msg}`)
      return { success: false, error: msg }
    }
  })

  // ── settings get ─────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.SETTINGS_GET, async (_event, payload: { key: string }) => {
    try {
      const value = sessionRepo.getSetting(payload.key)
      return { success: true, value }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  // ── settings set ─────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.SETTINGS_SET, async (_event, payload: { key: string; value: string }) => {
    try {
      sessionRepo.setSetting(payload.key, payload.value)

      // Side-effect: update AI service when the Gemini API key changes
      if (payload.key === 'gemini_api_key') {
        await aiService.setApiKey(payload.value)
      }

      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}
