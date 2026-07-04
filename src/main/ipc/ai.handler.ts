import { IpcMain } from 'electron'
import { aiService } from '@main/services/ai.service'
import { sotaService } from '@main/services/sota.service'
import { IPC } from '@shared/types/ipc.types'
import type { AIAnalysisRequest, AIMessage, AIMode } from '@shared/types/ai.types'
import { logger } from '@main/utils/logger'

export function registerAIHandlers(ipcMain: IpcMain): void {
  // Initialize AI from stored key on startup
  aiService.initialize().catch(err => logger.warn(`[ai] init error: ${err}`))

  // ── analyze ──────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.AI_ANALYZE, async (_event, payload: { request: AIAnalysisRequest }) => {
    try {
      const response = await aiService.analyze(payload.request)
      if (response.error) {
        return { success: false, error: response.error }
      }
      return { success: true, response }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error(`[ai] analyze handler error: ${msg}`)
      return { success: false, error: msg }
    }
  })

  // ── chat ─────────────────────────────────────────────────────────────────────
  ipcMain.handle(
    IPC.AI_CHAT,
    async (_event, payload: { history: AIMessage[]; message: string; mode: AIMode }) => {
      try {
        const response = await aiService.chat(payload.history, payload.message, payload.mode)
        if (response.error) {
          return { success: false, error: response.error }
        }
        return { success: true, response }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.error(`[ai] chat handler error: ${msg}`)
        return { success: false, error: msg }
      }
    }
  )

  // ── check configuration ───────────────────────────────────────────────────────
  ipcMain.handle('ai:check-config', async () => {
    return aiService.isConfigured()
  })

  // ── set API key via settings channel ─────────────────────────────────────────
  // Handled in session.handler's SETTINGS_SET, but also intercept here so
  // the service is updated immediately without a restart.
  ipcMain.handle('ai:set-key', async (_event, payload: { key: string }) => {
    try {
      await aiService.setApiKey(payload.key)
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  // ── SOTA 2026: PQC cryptographic audits ──────────────────────────────────────
  ipcMain.handle('sota:pqc-check', async (_event, payload: { port: number; serviceName?: string; product?: string; extraInfo?: string }) => {
    return sotaService.analyzePqcStatus(payload.port, payload.serviceName, payload.product, payload.extraInfo)
  })

  // ── SOTA 2026: PDDL action validations ───────────────────────────────────────
  ipcMain.handle('sota:pddl-validate', async (_event, payload: { action: string; targetIp: string; gatewayIp?: string }) => {
    return sotaService.validateActionWithPddl(payload.action, payload.targetIp, payload.gatewayIp)
  })

  // ── SOTA 2026: CTEM threat simulations ───────────────────────────────────────
  ipcMain.handle('sota:run-simulation', async (_event, payload: { type: string; targetIp: string }) => {
    return sotaService.runCtemSimulation(payload.type, payload.targetIp)
  })

  // ── SOTA 2026: Agent audit logs ──────────────────────────────────────────────
  ipcMain.handle('sota:get-logs', async () => {
    return sotaService.getAgentAuditLogs()
  })
}
