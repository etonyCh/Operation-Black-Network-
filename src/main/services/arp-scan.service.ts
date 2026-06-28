import { spawn } from 'child_process'
import { networkInterfaces } from 'os'
import { logger } from '@main/utils/logger'
import type { Device } from '@shared/types/device.types'

export interface NetworkInterface {
  name: string
  ip?: string
  mac?: string
  isUp: boolean
}

// ARP scan line:  192.168.1.1   aa:bb:cc:dd:ee:ff   Intel Corporation
const ARP_LINE_RE = /^([\d.]+)\s+([\da-f:]+)\s*(.*)$/i

class ArpScanService {
  /** Return all local network interfaces via Node's os.networkInterfaces(). */
  getLocalInterfaces(): NetworkInterface[] {
    const ifaces = networkInterfaces()
    const result: NetworkInterface[] = []

    for (const [name, addrs] of Object.entries(ifaces)) {
      if (!addrs) continue
      const ipv4 = addrs.find(a => a.family === 'IPv4' && !a.internal)
      const mac = addrs.find(a => a.mac && a.mac !== '00:00:00:00:00:00')?.mac
      result.push({
        name,
        ip: ipv4?.address,
        mac,
        isUp: !!ipv4,
      })
    }

    // Sort: active interfaces first
    return result.sort((a, b) => (b.isUp ? 1 : 0) - (a.isUp ? 1 : 0))
  }

  /**
   * Quick ARP scan for host discovery on the local subnet.
   * Returns discovered partial Devices (no ports/OS yet).
   */
  scan(sessionId: string, target?: string, iface?: string): Promise<Partial<Device>[]> {
    return new Promise((resolve, reject) => {
      const args: string[] = ['--plain', '--ignoredups']
      if (iface) args.push('--interface', iface)
      args.push(target ?? '--localnet')

      logger.info(`[arp-scan] arp-scan ${args.join(' ')}`)
      const child = spawn('arp-scan', args, { stdio: ['ignore', 'pipe', 'pipe'] })

      const devices: Partial<Device>[] = []
      let stderr = ''

      child.stdout?.on('data', (chunk: Buffer) => {
        for (const line of chunk.toString().split('\n')) {
          const m = line.match(ARP_LINE_RE)
          if (m) {
            devices.push({
              id: crypto.randomUUID(),
              sessionId,
              ip: m[1],
              mac: m[2],
              vendor: m[3]?.trim() || undefined,
              deviceType: 'unknown',
              status: 'online',
              discoveredAt: Date.now(),
              lastSeen: Date.now(),
            })
          }
        }
      })

      child.stderr?.on('data', (c: Buffer) => {
        stderr += c.toString()
      })

      child.on('close', code => {
        if (code !== 0 && devices.length === 0) {
          reject(new Error(`arp-scan failed (code ${code}): ${stderr}`))
        } else {
          resolve(devices)
        }
      })

      child.on('error', reject)
    })
  }
}

export const arpScanService = new ArpScanService()
