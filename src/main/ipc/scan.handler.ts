import { IpcMain, BrowserWindow } from 'electron'
import { nmapService } from '@main/services/nmap.service'
import { DeviceRepository } from '@main/db/repositories/device.repository'
import { IPC } from '@shared/types/ipc.types'
import type { ScanOptions } from '@shared/types/scan.types'
import { logger } from '@main/utils/logger'

function getWindow(): BrowserWindow | undefined {
  return BrowserWindow.getAllWindows()[0]
}

function send(channel: string, data: unknown): void {
  getWindow()?.webContents.send(channel, data)
}

export function registerScanHandlers(ipcMain: IpcMain): void {
  const deviceRepo = new DeviceRepository()

  // ── start scan ──────────────────────────────────────────────────────────────
  ipcMain.handle(
    IPC.SCAN_START,
    async (_event, payload: { sessionId: string; options: ScanOptions }) => {
      const { sessionId, options } = payload
      const scanId = crypto.randomUUID()

      try {
        const emitter = nmapService.startDiscoveryScan(scanId, sessionId, options)

        emitter.on('device-found', device => {
          // Persist to DB (upsert so re-scans update existing records)
          const saved = deviceRepo.upsert(device)
          send(IPC.SCAN_DEVICE_FOUND, saved)
        })

        emitter.on('progress', progress => {
          send(IPC.SCAN_PROGRESS, progress)
        })

        emitter.on('complete', (devices, _vulns) => {
          // Upsert all devices (already sent individually, but ensure DB is consistent)
          for (const d of devices) deviceRepo.upsert(d)
          send(IPC.SCAN_COMPLETE, { scanId, sessionId, deviceCount: devices.length })
          logger.info(`[scan] completed ${scanId}: ${devices.length} devices`)
        })

        emitter.on('error', err => {
          logger.error(`[scan] ${scanId} error: ${err.message}`)
          send(IPC.SCAN_ERROR, { scanId, error: err.message })
        })

        return { success: true, scanId }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.error(`[scan] start failed: ${msg}`)
        return { success: false, error: msg }
      }
    }
  )

  // ── stop scan ────────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.SCAN_STOP, async (_event, payload: { scanId: string }) => {
    try {
      const stopped = nmapService.stopScan(payload.scanId)
      return { success: stopped }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}
