import { IpcMain, BrowserWindow } from 'electron'
import { enumerationService } from '@main/services/enumeration.service'
import { logger } from '@main/utils/logger'
import * as crypto from 'crypto'

function send(channel: string, data: unknown): void {
  BrowserWindow.getAllWindows()[0]?.webContents.send(channel, data)
}

export function registerEnumerationHandlers(ipcMain: IpcMain): void {
  // ── Directory Enumeration ──────────────────────────────────────────────────
  ipcMain.handle(
    'sota:enum-start-dir',
    async (_event, payload: { targetUrl: string; customWordlist?: string[] }) => {
      const scanId = crypto.randomUUID()
      try {
        const emitter = enumerationService.startDirectoryEnum(
          scanId,
          payload.targetUrl,
          payload.customWordlist
        )

        emitter.on('result', (result) => {
          send('sota:enum-dir-result', { scanId, result })
        })

        emitter.on('progress', (progress) => {
          send('sota:enum-dir-progress', { scanId, progress })
        })

        emitter.on('complete', (status) => {
          send('sota:enum-dir-complete', { scanId, status })
        })

        emitter.on('error', (err) => {
          logger.error(`[enum:handler] Directory scan ${scanId} error: ${err}`)
          send('sota:enum-dir-complete', { scanId, status: { success: false, error: err.message || String(err) } })
        })

        return { success: true, scanId }
      } catch (err: any) {
        logger.error(`[enum:handler] Failed to start directory scan: ${err}`)
        return { success: false, error: err.message || String(err) }
      }
    }
  )

  ipcMain.handle('sota:enum-stop-dir', async (_event, payload: { scanId: string }) => {
    return { success: enumerationService.stopScan(payload.scanId) }
  })

  // ── DNS/Subdomain Enumeration ──────────────────────────────────────────────
  ipcMain.handle(
    'sota:enum-start-dns',
    async (_event, payload: { domain: string }) => {
      const scanId = crypto.randomUUID()
      try {
        const emitter = enumerationService.startDnsEnum(scanId, payload.domain)

        emitter.on('result', (result) => {
          send('sota:enum-dns-result', { scanId, result })
        })

        emitter.on('progress', (progress) => {
          send('sota:enum-dns-progress', { scanId, progress })
        })

        emitter.on('complete', (status) => {
          send('sota:enum-dns-complete', { scanId, status })
        })

        emitter.on('error', (err) => {
          logger.error(`[enum:handler] DNS scan ${scanId} error: ${err}`)
          send('sota:enum-dns-complete', { scanId, status: { success: false, error: err.message || String(err) } })
        })

        return { success: true, scanId }
      } catch (err: any) {
        logger.error(`[enum:handler] Failed to start DNS scan: ${err}`)
        return { success: false, error: err.message || String(err) }
      }
    }
  )

  ipcMain.handle('sota:enum-stop-dns', async (_event, payload: { scanId: string }) => {
    return { success: enumerationService.stopScan(payload.scanId) }
  })
}
