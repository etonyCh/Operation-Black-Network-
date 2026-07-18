import { IpcMain, ipcMain } from 'electron'
import { registerScanHandlers } from './scan.handler'
import { registerFingerprintHandlers } from './fingerprint.handler'
import { registerTrafficHandlers } from './traffic.handler'
import { registerProxyHandlers } from './proxy.handler'
import { registerAIHandlers } from './ai.handler'
import { registerReportHandlers } from './report.handler'
import { registerSessionHandlers } from './session.handler'
import { registerEnumerationHandlers } from './enumeration.handler'
import { checkAllDependencies } from '@main/utils/permissions'
import { arpScanService } from '@main/services/arp-scan.service'
import { IPC } from '@shared/types/ipc.types'
import { logger } from '@main/utils/logger'

// ── System handlers (inline, no separate file needed) ────────────────────────

function registerSystemHandlers(ipc: IpcMain): void {
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

  ipc.handle(IPC.SYSTEM_GET_MISSING_DEPS, async () => {
    try {
      const deps = await checkAllDependencies()
      const missing = deps.filter(d => !d.available)
      return { success: true, missing }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      return { success: false, error: msg, missing: [] }
    }
  })

  ipc.handle(IPC.SYSTEM_INSTALL_DEPS, async (event, payload: { tools: string[] }) => {
    const { spawn } = require('child_process')
    const { BrowserWindow } = require('electron')
    const win = BrowserWindow.getAllWindows()[0]

    // Map internal names to apt package names
    const aptMap: Record<string, string> = {
      'nmap': 'nmap',
      'tshark': 'tshark wireshark-common',
      'arp-scan': 'arp-scan',
      'mitmproxy': 'mitmproxy',
      'arpspoof': 'dsniff'
    }

    const packages = payload.tools.map(t => aptMap[t]).filter(Boolean)
    if (packages.length === 0) return { success: true }

    return new Promise((resolve) => {
      // Build a bash script that installs sequentially and echoes markers
      let script = 'apt-get update -y;'
      for (const t of payload.tools) {
        if (!aptMap[t]) continue
        script += `echo "START:${t}"; DEBIAN_FRONTEND=noninteractive apt-get install -y ${aptMap[t]}; echo "DONE:${t}";`
      }
      script += `setcap cap_net_raw,cap_net_admin,cap_dac_override+eip /usr/bin/nmap || true;`
      script += `setcap cap_net_raw,cap_net_admin+eip /usr/bin/tshark || true;`
      script += `setcap cap_net_raw,cap_net_admin+eip /usr/bin/dumpcap || true;`
      script += `usermod -a -G wireshark $SUDO_USER || true;`

      const child = spawn('pkexec', ['bash', '-c', script])
      let currentTool = ''

      child.stdout.on('data', (data: Buffer) => {
        const text = data.toString()
        const lines = text.split('\n')
        for (const line of lines) {
          if (line.startsWith('START:')) {
            currentTool = line.split(':')[1]
            win?.webContents.send('dependency:install:progress', { tool: currentTool, status: 'installing' })
          } else if (line.startsWith('DONE:')) {
            const tool = line.split(':')[1]
            win?.webContents.send('dependency:install:progress', { tool, status: 'done' })
          }
        }
      })

      child.stderr.on('data', (data: Buffer) => {
        logger.debug(`[apt-get] ${data.toString()}`)
      })

      child.on('close', (code: number) => {
        if (code === 0) {
          win?.webContents.send('dependency:install:done')
          resolve({ success: true })
        } else {
          win?.webContents.send('dependency:install:error', { error: `Installation failed with code ${code}` })
          resolve({ success: false, error: `Code ${code}` })
        }
      })
      
      child.on('error', (err: any) => {
        win?.webContents.send('dependency:install:error', { error: err.message })
        resolve({ success: false, error: err.message })
      })
    })
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
  registerEnumerationHandlers(ipcMain)
  logger.info('[ipc] all handlers registered')
}
