import { IpcMain, BrowserWindow } from 'electron'
import { reportService } from '@main/services/report.service'
import { aiService } from '@main/services/ai.service'
import { SessionRepository } from '@main/db/repositories/session.repository'
import { DeviceRepository } from '@main/db/repositories/device.repository'
import { VulnerabilityRepository } from '@main/db/repositories/vulnerability.repository'
import { TrafficRepository } from '@main/db/repositories/traffic.repository'
import { ProxyRepository } from '@main/db/repositories/proxy.repository'
import { IPC } from '@shared/types/ipc.types'
import type { ReportOptions } from '@shared/types/report.types'
import { logger } from '@main/utils/logger'

function send(channel: string, data: unknown): void {
  BrowserWindow.getAllWindows()[0]?.webContents.send(channel, data)
}

export function registerReportHandlers(ipcMain: IpcMain): void {
  const sessionRepo = new SessionRepository()
  const deviceRepo = new DeviceRepository()
  const vulnRepo = new VulnerabilityRepository()
  const trafficRepo = new TrafficRepository()
  const proxyRepo = new ProxyRepository()

  ipcMain.handle(IPC.REPORT_GENERATE, async (_event, payload: { options: ReportOptions }) => {
    const { options } = payload
    const { sessionId } = options

    try {
      // ── Step 1: load session metadata ─────────────────────────────────────
      send(IPC.REPORT_PROGRESS, { phase: 'Loading session data', percent: 10 })
      const session = sessionRepo.findById(sessionId)
      if (!session) {
        return { success: false, error: `Session ${sessionId} not found` }
      }

      // ── Step 2: load all associated data ──────────────────────────────────
      send(IPC.REPORT_PROGRESS, { phase: 'Fetching devices and vulnerabilities', percent: 25 })
      const devices = deviceRepo.findBySessionId(sessionId)
      const vulnerabilities = vulnRepo.findBySessionId(sessionId)

      send(IPC.REPORT_PROGRESS, { phase: 'Fetching traffic data', percent: 40 })
      const packets = trafficRepo.findPacketsBySessionId(sessionId)
      const credentials = trafficRepo.findCredentialsBySessionId(sessionId)
      const alerts = trafficRepo.findAlertsBySessionId(sessionId)

      send(IPC.REPORT_PROGRESS, { phase: 'Fetching proxy captures', percent: 55 })
      const proxyRequests = proxyRepo.findRequestsBySessionId(sessionId)

      // ── Step 3: optional AI summary ───────────────────────────────────────
      let aiSummary: string | undefined
      if (options.includeSections.aiSummary && aiService.isConfigured()) {
        send(IPC.REPORT_PROGRESS, { phase: 'Generating AI summary', percent: 70 })
        try {
          const aiResult = await aiService.analyzeVulnerabilities(devices, vulnerabilities)
          if (!aiResult.error && aiResult.text) {
            aiSummary = aiResult.text
          }
        } catch (aiErr) {
          logger.warn(`[report] AI summary skipped: ${aiErr}`)
        }
      }

      // ── Step 4: generate document ─────────────────────────────────────────
      send(IPC.REPORT_PROGRESS, { phase: `Rendering ${options.format.toUpperCase()}`, percent: 85 })
      const result = await reportService.generate(options, {
        session,
        devices,
        vulnerabilities,
        packets,
        credentials,
        alerts,
        proxyRequests,
        aiSummary,
      })

      if (result.success) {
        send(IPC.REPORT_COMPLETE, result)
        logger.info(`[report] generated: ${result.path}`)
      } else {
        send(IPC.REPORT_ERROR, { error: result.error })
      }

      return result
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error(`[report] generation failed: ${msg}`)
      send(IPC.REPORT_ERROR, { error: msg })
      return { success: false, error: msg }
    }
  })
}
