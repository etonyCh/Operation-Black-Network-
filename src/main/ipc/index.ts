import { IpcMain, ipcMain } from 'electron'
import { registerScanHandlers } from './scan.handler'
import { registerFingerprintHandlers } from './fingerprint.handler'
import { registerTrafficHandlers } from './traffic.handler'
import { registerProxyHandlers } from './proxy.handler'
import { registerAIHandlers } from './ai.handler'
import { registerReportHandlers } from './report.handler'
import { registerSessionHandlers } from './session.handler'
import { checkAllDependencies } from '@main/utils/permissions'
import { arpScanService } from '@main/services/arp-scan.service'
import { IPC } from '@shared/types/ipc.types'
import { logger } from '@main/utils/logger'

// ── System handlers (inline, no separate file needed) ────────────────────────

function registerSystemHandlers(ipc: IpcMain): void {
  // Returns dependency availability status for each required tool
  ipc.handle(IPC.SYSTEM_CHECK_DEPS, async () => {
    try {
      const deps = await checkAllDependencies()
      return { success: true, deps }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error(`[system] dependency check failed: ${msg}`)
      return { success: false, error: msg, deps: [] }
    }
  })

  // Returns all local network interfaces (name, IP, MAC, isUp)
  ipc.handle(IPC.SYSTEM_GET_INTERFACES, async () => {
    try {
      const interfaces = arpScanService.getLocalInterfaces()
      return { success: true, interfaces }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error(`[system] get interfaces failed: ${msg}`)
      return { success: false, error: msg, interfaces: [] }
    }
  })
}

// ── Main registration entry point ─────────────────────────────────────────────

export function registerAllHandlers(): void {
  registerSystemHandlers(ipcMain)
  registerScanHandlers(ipcMain)
  registerFingerprintHandlers(ipcMain)
  registerTrafficHandlers(ipcMain)
  registerProxyHandlers(ipcMain)
  registerAIHandlers(ipcMain)
  registerReportHandlers(ipcMain)
  registerSessionHandlers(ipcMain)
  logger.info('[ipc] all handlers registered')
}
