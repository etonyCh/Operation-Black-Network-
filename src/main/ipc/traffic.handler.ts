import { IpcMain, BrowserWindow } from 'electron'
import { tsharkService } from '@main/services/tshark.service'
import { TrafficRepository } from '@main/db/repositories/traffic.repository'
import { IPC } from '@shared/types/ipc.types'
import { logger } from '@main/utils/logger'

function send(channel: string, data: unknown): void {
  BrowserWindow.getAllWindows()[0]?.webContents.send(channel, data)
}

export function registerTrafficHandlers(ipcMain: IpcMain): void {
  const trafficRepo = new TrafficRepository()

  // ── start capture ────────────────────────────────────────────────────────────
  ipcMain.handle(
    IPC.TRAFFIC_START,
    async (_event, payload: { sessionId: string; iface: string; filter?: string }) => {
      const { sessionId, iface, filter } = payload

      try {
        const emitter = tsharkService.startCapture(sessionId, iface, filter)

        emitter.on('packet', packet => {
          trafficRepo.savePacket(packet)
          send(IPC.TRAFFIC_PACKET, packet)
        })

        emitter.on('credential', cred => {
          trafficRepo.saveCredential(cred)
          send(IPC.TRAFFIC_CREDENTIAL, cred)
        })

        emitter.on('alert', alert => {
          trafficRepo.saveAlert(alert)
          send(IPC.TRAFFIC_ALERT, alert)
        })

        emitter.on('stats', stats => {
          send(IPC.TRAFFIC_STATS, stats)
        })

        emitter.on('error', err => {
          logger.error(`[traffic] capture error: ${err.message}`)
          send(IPC.TRAFFIC_ERROR, { error: err.message })
        })

        logger.info(`[traffic] capture started on ${iface} for session ${sessionId}`)
        return { success: true }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.error(`[traffic] start failed: ${msg}`)
        return { success: false, error: msg }
      }
    }
  )

  // ── stop capture ─────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.TRAFFIC_STOP, async () => {
    try {
      tsharkService.stopCapture()
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })
}
