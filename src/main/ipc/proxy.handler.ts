import { IpcMain, BrowserWindow } from 'electron'
import { spawn, ChildProcess } from 'child_process'
import { mitmproxyService } from '@main/services/mitmproxy.service'
import { ProxyRepository } from '@main/db/repositories/proxy.repository'
import { IPC } from '@shared/types/ipc.types'
import type { ARPConfig, ProxyRequest } from '@shared/types/proxy.types'
import { logger } from '@main/utils/logger'

function send(channel: string, data: unknown): void {
  BrowserWindow.getAllWindows()[0]?.webContents.send(channel, data)
}

// ARP spoof processes (bidirectional MITM needs two processes)
let arpProcesses: ChildProcess[] = []

function killArpProcesses(): void {
  for (const proc of arpProcesses) {
    try {
      proc.kill('SIGTERM')
    } catch {
      /* ignore */
    }
  }
  arpProcesses = []
}

export function registerProxyHandlers(ipcMain: IpcMain): void {
  const proxyRepo = new ProxyRepository()

  // ── start proxy ──────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.PROXY_START, async (_event, payload: { sessionId: string; port?: number }) => {
    const { sessionId, port = 8080 } = payload

    try {
      const emitter = mitmproxyService.start(sessionId, port)

      emitter.on('request', req => {
        proxyRepo.saveRequest(req)
        send(IPC.PROXY_REQUEST, req)
      })

      emitter.on('response', resp => {
        proxyRepo.saveResponse(resp)
        send(IPC.PROXY_RESPONSE, resp)
      })

      emitter.on('error', err => {
        logger.error(`[proxy] error: ${err.message}`)
        send(IPC.PROXY_ERROR, { error: err.message })
      })

      logger.info(`[proxy] mitmdump started on port ${port}`)
      return { success: true, proxyPort: port }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error(`[proxy] start failed: ${msg}`)
      return { success: false, error: msg }
    }
  })

  // ── stop proxy ───────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.PROXY_STOP, async () => {
    try {
      mitmproxyService.stop()
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  // ── start ARP spoof (bidirectional MITM) ─────────────────────────────────────
  ipcMain.handle(IPC.PROXY_ARP_START, async (_event, payload: { config: ARPConfig }) => {
    const { targetIp, gatewayIp, interface: iface } = payload.config

    try {
      // Ensure any previous spoof is stopped
      killArpProcesses()

      // Enable IP forwarding so intercepted traffic is actually forwarded
      spawn('pkexec', ['sh', '-c', 'echo 1 > /proc/sys/net/ipv4/ip_forward'], {
        stdio: 'ignore',
      })

      // target → gateway direction: victim sees us as the gateway
      const proc1 = spawn('pkexec', ['arpspoof', '-i', iface, '-t', targetIp, gatewayIp], {
        stdio: 'ignore',
      })

      // gateway → target direction: gateway sees us as the victim
      const proc2 = spawn('pkexec', ['arpspoof', '-i', iface, '-t', gatewayIp, targetIp], {
        stdio: 'ignore',
      })

      arpProcesses = [proc1, proc2]

      for (const proc of arpProcesses) {
        proc.on('error', err => {
          logger.error(`[arpspoof] process error: ${err.message}`)
          send(IPC.PROXY_ERROR, { error: `arpspoof: ${err.message}` })
        })
      }

      logger.info(`[arpspoof] MITM started: ${targetIp} <-> ${gatewayIp} via ${iface}`)
      return { success: true }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      logger.error(`[arpspoof] start failed: ${msg}`)
      return { success: false, error: msg }
    }
  })

  // ── stop ARP spoof ────────────────────────────────────────────────────────────
  ipcMain.handle(IPC.PROXY_ARP_STOP, async () => {
    try {
      killArpProcesses()
      // Disable IP forwarding
      spawn('pkexec', ['sh', '-c', 'echo 0 > /proc/sys/net/ipv4/ip_forward'], {
        stdio: 'ignore',
      })
      logger.info('[arpspoof] ARP spoofing stopped')
      return { success: true }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : String(err) }
    }
  })

  // ── replay request ────────────────────────────────────────────────────────────
  ipcMain.handle(
    IPC.PROXY_REPLAY,
    async (_event, payload: { req: ProxyRequest; modifications?: Partial<ProxyRequest> }) => {
      try {
        const response = await mitmproxyService.replayRequest(payload.req, payload.modifications)
        proxyRepo.saveResponse(response)
        send(IPC.PROXY_RESPONSE, response)
        return { success: true, response }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        logger.error(`[proxy] replay failed: ${msg}`)
        return { success: false, error: msg }
      }
    }
  )
}
