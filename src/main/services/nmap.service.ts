import { EventEmitter } from 'events'
import { spawn, ChildProcess } from 'child_process'
import { parseNmapXml } from '@main/utils/xml-parser'
import { logger } from '@main/utils/logger'
import type { ScanOptions } from '@shared/types/scan.types'
import type { Device } from '@shared/types/device.types'
import type { Vulnerability } from '@shared/types/vulnerability.types'

export interface ScanEmitter extends EventEmitter {
  on(event: 'device-found', listener: (device: Device) => void): this
  on(event: 'progress', listener: (data: { phase: string; percent: number }) => void): this
  on(
    event: 'complete',
    listener: (devices: Device[], vulnerabilities: Vulnerability[]) => void
  ): this
  on(event: 'error', listener: (err: Error) => void): this
}

class NmapService {
  private readonly processes = new Map<string, ChildProcess>()

  /** Start an active discovery/port-scan and return a per-scan EventEmitter. */
  startDiscoveryScan(scanId: string, sessionId: string, options: ScanOptions): ScanEmitter {
    const emitter = new EventEmitter() as ScanEmitter
    const args = this.buildDiscoveryArgs(options)
    logger.info(`[nmap] discovery ${scanId}: nmap ${args.join(' ')}`)

    const child = spawn('nmap', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    this.processes.set(scanId, child)
    let buffer = ''

    child.stdout?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      this.emitProgress(emitter, chunk.toString())
    })

    child.on('close', async code => {
      this.processes.delete(scanId)
      if (buffer.includes('<nmaprun')) {
        try {
          const { devices, vulnerabilities } = await parseNmapXml(buffer, sessionId)
          for (const d of devices) emitter.emit('device-found', d)
          emitter.emit('complete', devices, vulnerabilities)
        } catch (err) {
          emitter.emit('error', new Error(`nmap XML parse failed: ${err}`))
        }
      } else {
        emitter.emit('error', new Error(`nmap exited with code ${code} and produced no XML`))
      }
    })

    child.on('error', err => {
      this.processes.delete(scanId)
      emitter.emit('error', err)
    })

    return emitter
  }

  /** Deep-dive fingerprint (service versions, OS, vuln scripts). */
  startFingerprinting(
    fingerprintId: string,
    sessionId: string,
    ip: string,
    timeout = 120
  ): ScanEmitter {
    const emitter = new EventEmitter() as ScanEmitter
    const args = [
      '--privileged',
      '-sV',
      '--version-intensity',
      '5',
      '-O',
      '--osscan-guess',
      '--script',
      'vuln,banner,default',
      '-T4',
      '--host-timeout',
      `${timeout}s`,
      '--stats-every',
      '5s',
      '-oX',
      '-',
      ip,
    ]
    logger.info(`[nmap] fingerprint ${fingerprintId}: ${ip}`)

    const child = spawn('nmap', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    this.processes.set(fingerprintId, child)
    let buffer = ''

    child.stdout?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
    })

    child.stderr?.on('data', (chunk: Buffer) => {
      this.emitProgress(emitter, chunk.toString())
    })

    child.on('close', async () => {
      this.processes.delete(fingerprintId)
      if (buffer.includes('<nmaprun')) {
        try {
          const { devices, vulnerabilities } = await parseNmapXml(buffer, sessionId)
          emitter.emit('complete', devices, vulnerabilities)
        } catch (err) {
          emitter.emit('error', new Error(`Fingerprint parse failed: ${err}`))
        }
      } else {
        emitter.emit('error', new Error('Fingerprint produced no XML output'))
      }
    })

    child.on('error', err => {
      this.processes.delete(fingerprintId)
      emitter.emit('error', err)
    })

    return emitter
  }

  stopScan(id: string): boolean {
    const proc = this.processes.get(id)
    if (!proc) return false
    proc.kill('SIGTERM')
    this.processes.delete(id)
    return true
  }

  private buildDiscoveryArgs(options: ScanOptions): string[] {
    const args: string[] = ['--privileged', '--stats-every', '5s', '-oX', '-']

    switch (options.mode) {
      case 'quick':
        args.push('-sn', '-T4')
        break
      case 'normal':
        args.push('-sV', '-T3', '--open', '-p', options.ports ?? '1-1000')
        break
      case 'aggressive':
        args.push('-sV', '-O', '-sC', '-T4', '--open', '-p', options.ports ?? '1-65535')
        break
      case 'ai-deep' as any:
        args.push('-sn', '-PR', '-PS22,80,443', '-PU53,137,1900,5353', '-PE', '-T4')
        break
    }

    if (options.interface) args.push('-e', options.interface)
    if (options.timeout) args.push('--host-timeout', `${options.timeout}s`)
    args.push(options.target)
    return args
  }

  private emitProgress(emitter: ScanEmitter, text: string): void {
    const pct = text.match(/About\s+([\d.]+)%\s+done/i)
    if (pct) {
      emitter.emit('progress', { phase: 'scanning', percent: parseFloat(pct[1]) })
      return
    }
    const stats = text.match(/(\d+)\s+hosts? completed.*?\((\d+)\s+up\)/i)
    if (stats) {
      emitter.emit('progress', {
        phase: 'scanning',
        percent: -1,
        hostsScanned: parseInt(stats[1], 10),
      })
    }
  }
}

export const nmapService = new NmapService()
