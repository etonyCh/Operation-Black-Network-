import { IpcMain, BrowserWindow } from 'electron'
import { nmapService } from '@main/services/nmap.service'
import { nvdService } from '@main/services/nvd.service'
import { aiService } from '@main/services/ai.service'
import { DeviceRepository } from '@main/db/repositories/device.repository'
import { VulnerabilityRepository } from '@main/db/repositories/vulnerability.repository'
import { IPC } from '@shared/types/ipc.types'
import type { FingerprintOptions } from '@shared/types/scan.types'
import { logger } from '@main/utils/logger'

function send(channel: string, data: unknown): void {
  BrowserWindow.getAllWindows()[0]?.webContents.send(channel, data)
}

export function registerFingerprintHandlers(ipcMain: IpcMain): void {
  const deviceRepo = new DeviceRepository()
  const vulnRepo = new VulnerabilityRepository()

  ipcMain.handle(
    IPC.FINGERPRINT_START,
    async (_event, payload: { sessionId: string; options: FingerprintOptions }) => {
      const { sessionId, options } = payload
      const fingerprintId = crypto.randomUUID()

      try {
        const emitter = nmapService.startFingerprinting(
          fingerprintId,
          sessionId,
          options.ip,
          options.timeout
        )

        emitter.on('progress', progress => {
          send(IPC.FINGERPRINT_PROGRESS, progress)
        })

        emitter.on('complete', async (devices, rawVulnerabilities) => {
          // Update the device record with enriched OS and port data
          if (devices.length > 0) {
            const fingerprintedDevice = { ...devices[0], id: options.deviceId }
            deviceRepo.update(options.deviceId, {
              ports: fingerprintedDevice.ports,
              os: fingerprintedDevice.os,
              status: 'online',
            })
          }

          let vulns = rawVulnerabilities
          // Optionally enrich CVEs with NVD data
          if (options.checkVulns && vulns.length > 0) {
            send(IPC.FINGERPRINT_PROGRESS, { phase: 'enriching CVEs', percent: 90 })
            try {
              vulns = await nvdService.enrichMultiple(vulns)
            } catch (nvdErr) {
              logger.warn(`[fingerprint] NVD enrichment failed: ${nvdErr}`)
            }
          }

          // Save vulnerabilities to DB
          if (vulns.length > 0) {
            const withDeviceId = vulns.map(v => ({ ...v, deviceId: options.deviceId, sessionId }))
            vulnRepo.createMany(withDeviceId)
          }

          // Trigger background AI analysis (non-blocking)
          const allDevices = deviceRepo.findBySessionId(sessionId)
          const allVulns = vulnRepo.findBySessionId(sessionId)
          aiService
            .analyzeVulnerabilities(allDevices, allVulns)
            .then(analysis => {
              if (analysis.text && !analysis.error) {
                send('ai:background-analysis', { sessionId, text: analysis.text })
              }
            })
            .catch(() => {
              /* background, ignore */
            })

          send(IPC.FINGERPRINT_COMPLETE, {
            fingerprintId,
            deviceId: options.deviceId,
            vulnerabilities: vulns,
            deviceCount: devices.length,
          })
          logger.info(`[fingerprint] ${fingerprintId} complete: ${vulns.length} vulns`)
        })

        emitter.on('error', err => {
          logger.error(`[fingerprint] ${fingerprintId} error: ${err.message}`)
          send(IPC.FINGERPRINT_ERROR, { fingerprintId, error: err.message })
        })

        return { success: true, fingerprintId }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.error(`[fingerprint] start failed: ${msg}`)
        return { success: false, error: msg }
      }
    }
  )
}
