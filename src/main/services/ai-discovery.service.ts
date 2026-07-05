import { EventEmitter } from 'events'
import { spawn } from 'child_process'
import mdns from 'multicast-dns'
import * as crypto from 'crypto'
import { Client as SsdpClient } from 'node-ssdp'
import { nmapService, ScanEmitter } from './nmap.service'
import { logger } from '@main/utils/logger'
import type { Device } from '@shared/types/device.types'
import type { ScanOptions } from '@shared/types/scan.types'

export interface AiScanEmitter extends EventEmitter {
  on(event: 'device-found', listener: (device: Device) => void): this
  on(event: 'progress', listener: (data: { phase: string; percent: number; message?: string }) => void): this
  on(event: 'complete', listener: (devices: Device[]) => void): this
  on(event: 'error', listener: (err: Error) => void): this
}

class AiDiscoveryService {
  private activeScans = new Map<string, { stop: () => void }>()

  start(scanId: string, sessionId: string, options: ScanOptions): AiScanEmitter {
    const emitter = new EventEmitter() as AiScanEmitter
    const discoveredDevices = new Map<string, Device>()

    let isStopped = false

    const addDevice = (ip: string, partial: Partial<Device>) => {
      if (isStopped) return
      let existing = discoveredDevices.get(ip)
      if (!existing) {
        existing = {
          id: crypto.randomUUID(),
          sessionId,
          ip,
          deviceType: partial.deviceType || 'unknown',
          status: 'online',
          discoveredAt: Date.now(),
          lastSeen: Date.now(),
          ...partial
        } as Device
        discoveredDevices.set(ip, existing)
        emitter.emit('device-found', existing)
      } else {
        // Merge updates
        let updated = false
        if (partial.mac && !existing.mac) { existing.mac = partial.mac; updated = true; }
        if (partial.vendor && !existing.vendor) { existing.vendor = partial.vendor; updated = true; }
        if (partial.hostname && !existing.hostname) { existing.hostname = partial.hostname; updated = true; }
        if (partial.os && !existing.os) { existing.os = partial.os; updated = true; }
        if (partial.deviceType && existing.deviceType === 'unknown') { existing.deviceType = partial.deviceType as any; updated = true; }
        if (updated) {
          existing.lastSeen = Date.now()
          emitter.emit('device-found', existing)
        }
      }
    }

    const runPhases = async () => {
      // PHASE 1: mDNS
      if (isStopped) return
      emitter.emit('progress', { phase: 'mDNS', percent: 10, message: 'Broadcasting mDNS probes to wake up Apple/Android devices...' })
      await this.runMdns(addDevice)

      // PHASE 2: SSDP
      if (isStopped) return
      emitter.emit('progress', { phase: 'SSDP', percent: 30, message: 'Sweeping network for UPnP/IoT endpoints...' })
      await this.runSsdp(addDevice)

      // PHASE 3: Passive Tshark
      if (isStopped) return
      emitter.emit('progress', { phase: 'Passive', percent: 50, message: 'Listening passively to bypass endpoint firewalls (8s)...' })
      await this.runPassiveSniffing(addDevice)

      // PHASE 4: Deep Nmap
      if (isStopped) return
      emitter.emit('progress', { phase: 'Nmap', percent: 70, message: 'Initiating Deep Host Discovery (TCP/UDP/ICMP/ARP)...' })
      await this.runDeepNmap(scanId, sessionId, options, addDevice, emitter)
      
      if (isStopped) return
      emitter.emit('progress', { phase: 'Complete', percent: 100, message: 'Deep discovery complete.' })
      emitter.emit('complete', Array.from(discoveredDevices.values()))
    }

    const abortController = new AbortController()

    this.activeScans.set(scanId, {
      stop: () => {
        isStopped = true
        abortController.abort()
      }
    })

    runPhases().catch(err => {
      if (!isStopped) emitter.emit('error', err)
    }).finally(() => {
      this.activeScans.delete(scanId)
    })

    return emitter
  }

  stop(scanId: string): boolean {
    const scan = this.activeScans.get(scanId)
    if (scan) {
      scan.stop()
      this.activeScans.delete(scanId)
      return true
    }
    return false
  }

  private runMdns(addDevice: (ip: string, d: Partial<Device>) => void): Promise<void> {
    return new Promise(resolve => {
      try {
        const m = mdns()
        m.on('response', (response: any) => {
          const ips: string[] = []
          const hostnames: string[] = []
          response.answers?.forEach((ans: any) => {
            if (ans.type === 'A') ips.push(ans.data)
            if (ans.type === 'PTR') hostnames.push(ans.data)
          })
          ips.forEach(ip => {
            addDevice(ip, { hostname: hostnames[0]?.replace('.local', '') })
          })
        })
        
        m.query({ questions: [{ name: '_services._dns-sd._udp.local', type: 'PTR' }] })
        m.query({ questions: [{ name: '_http._tcp.local', type: 'PTR' }] })
        m.query({ questions: [{ name: '_workstation._tcp.local', type: 'PTR' }] })
        m.query({ questions: [{ name: '_googlecast._tcp.local', type: 'PTR' }] })
        m.query({ questions: [{ name: '_apple-mobdev2._tcp.local', type: 'PTR' }] })
        
        setTimeout(() => {
          m.destroy()
          resolve()
        }, 3000)
      } catch (err) {
        logger.warn(`mDNS failed: ${err}`)
        resolve()
      }
    })
  }

  private runSsdp(addDevice: (ip: string, d: Partial<Device>) => void): Promise<void> {
    return new Promise(resolve => {
      try {
        const client = new SsdpClient()
        client.on('response', (headers: any, statusCode: number, rinfo: any) => {
          const server = headers['SERVER'] || ''
          addDevice(rinfo.address, { 
            vendor: server ? server.substring(0, 30) : undefined,
            deviceType: server.toLowerCase().includes('camera') ? 'camera' : 'iot'
          })
        })
        client.search('ssdp:all')
        
        setTimeout(() => {
          client.stop()
          resolve()
        }, 3000)
      } catch (err) {
        logger.warn(`SSDP failed: ${err}`)
        resolve()
      }
    })
  }

  private runPassiveSniffing(addDevice: (ip: string, d: Partial<Device>) => void): Promise<void> {
    return new Promise(resolve => {
      try {
        const child = spawn('tshark', [
          '-a', 'duration:8',
          '-T', 'fields',
          '-e', 'ip.src',
          '-e', 'eth.src',
        ], { stdio: ['ignore', 'pipe', 'ignore'] })
        
        child.stdout?.on('data', (chunk: Buffer) => {
          const lines = chunk.toString().split('\n')
          lines.forEach(line => {
            const [ip, mac] = line.trim().split(/\s+/)
            if (ip && mac && ip.includes('.') && mac.includes(':')) {
              addDevice(ip, { mac })
            }
          })
        })
        
        child.on('close', () => resolve())
        child.on('error', () => resolve())
      } catch (err) {
        logger.warn(`Passive tshark failed: ${err}`)
        resolve()
      }
    })
  }

  private runDeepNmap(scanId: string, sessionId: string, options: ScanOptions, addDevice: (ip: string, d: Partial<Device>) => void, emitter: AiScanEmitter): Promise<void> {
    return new Promise((resolve, reject) => {
      const nmapEmitter = nmapService.startDiscoveryScan(scanId + '-deep', sessionId, { ...options, mode: 'ai-deep' as any })
      
      nmapEmitter.on('device-found', (d) => {
        addDevice(d.ip, d)
      })
      nmapEmitter.on('progress', (p: any) => {
        emitter.emit('progress', { phase: 'Nmap', percent: 70 + (p.percent > 0 ? p.percent * 0.25 : 0), message: 'Deep Host Discovery in progress...' })
      })
      nmapEmitter.on('complete', () => resolve())
      nmapEmitter.on('error', (err: any) => reject(err))
    })
  }
}

export const aiDiscoveryService = new AiDiscoveryService()
