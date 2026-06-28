import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EventEmitter } from 'events'
import { PassThrough } from 'stream'
import { readFileSync } from 'fs'
import { resolve } from 'path'

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}))

import { spawn } from 'child_process'
import { nmapService } from '@main/services/nmap.service'

const FIXTURE_XML = readFileSync(resolve(__dirname, '../../fixtures/nmap-scan.xml'), 'utf-8')

function createMockProcess() {
  const proc = new EventEmitter() as any
  proc.stdout = new PassThrough()
  proc.stderr = new PassThrough()
  proc.kill = vi.fn()
  return proc
}

describe('NmapService', () => {
  beforeEach(() => {
    vi.mocked(spawn).mockReset()
  })

  // -------------------------------------------------------------------------
  // startDiscoveryScan — argument building
  // -------------------------------------------------------------------------

  describe('startDiscoveryScan', () => {
    it('calls spawn with nmap binary', () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      nmapService.startDiscoveryScan('scan-bin', 'sess-1', {
        target: '192.168.1.0/24',
        mode: 'quick',
      })

      expect(spawn).toHaveBeenCalledWith('nmap', expect.any(Array), expect.any(Object))
    })

    it('quick mode args include -sn and -T4', () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      nmapService.startDiscoveryScan('scan-quick', 'sess-1', {
        target: '192.168.1.0/24',
        mode: 'quick',
      })

      const args = vi.mocked(spawn).mock.calls[0][1] as string[]
      expect(args).toContain('-sn')
      expect(args).toContain('-T4')
      // Target must be the last argument
      expect(args[args.length - 1]).toBe('192.168.1.0/24')
    })

    it('normal mode args include -sV, -T3, --open, and port range', () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      nmapService.startDiscoveryScan('scan-normal', 'sess-1', {
        target: '10.0.0.0/24',
        mode: 'normal',
      })

      const args = vi.mocked(spawn).mock.calls[0][1] as string[]
      expect(args).toContain('-sV')
      expect(args).toContain('-T3')
      expect(args).toContain('--open')
      expect(args).toContain('-p')
      // Default port range for normal
      expect(args[args.indexOf('-p') + 1]).toBe('1-1000')
    })

    it('aggressive mode args include -sV, -O, -sC, and -T4', () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      nmapService.startDiscoveryScan('scan-agg', 'sess-1', {
        target: '10.0.0.0/24',
        mode: 'aggressive',
      })

      const args = vi.mocked(spawn).mock.calls[0][1] as string[]
      expect(args).toContain('-sV')
      expect(args).toContain('-O')
      expect(args).toContain('-sC')
      expect(args).toContain('-T4')
      // Aggressive scans all ports by default
      expect(args[args.indexOf('-p') + 1]).toBe('1-65535')
    })

    it('includes -e <interface> when interface option provided', () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      nmapService.startDiscoveryScan('scan-iface', 'sess-1', {
        target: '10.0.0.0/24',
        mode: 'quick',
        interface: 'eth0',
      })

      const args = vi.mocked(spawn).mock.calls[0][1] as string[]
      expect(args).toContain('-e')
      const idx = args.indexOf('-e')
      expect(args[idx + 1]).toBe('eth0')
    })

    // -------------------------------------------------------------------------
    // startDiscoveryScan — event emission
    // -------------------------------------------------------------------------

    it('emits device-found for each up host in the XML', async () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      const emitter = nmapService.startDiscoveryScan('scan-devs', 'sess-1', {
        target: '192.168.1.0/24',
        mode: 'quick',
      })

      const devices: any[] = []
      emitter.on('device-found', d => devices.push(d))

      const completed = new Promise<void>(resolve => emitter.on('complete', () => resolve()))

      // Push fixture XML (2 up, 1 down) and signal end
      proc.stdout.push(FIXTURE_XML)
      proc.stdout.push(null)
      proc.emit('close', 0)

      await completed

      expect(devices).toHaveLength(2)
      expect(devices.map((d: any) => d.ip)).toContain('192.168.1.1')
      expect(devices.map((d: any) => d.ip)).toContain('192.168.1.100')
    })

    it('emits complete with devices and vulnerabilities arrays', async () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      const emitter = nmapService.startDiscoveryScan('scan-cmp', 'sess-1', {
        target: '192.168.1.0/24',
        mode: 'quick',
      })

      let completeDevices: any[] | null = null
      let completeVulns: any[] | null = null

      const completed = new Promise<void>(resolve =>
        emitter.on('complete', (devs, vulns) => {
          completeDevices = devs
          completeVulns = vulns
          resolve()
        })
      )

      proc.stdout.push(FIXTURE_XML)
      proc.stdout.push(null)
      proc.emit('close', 0)

      await completed

      expect(Array.isArray(completeDevices)).toBe(true)
      expect(completeDevices).toHaveLength(2)
      expect(Array.isArray(completeVulns)).toBe(true)
      // nmap-scan.xml has no vuln scripts
      expect(completeVulns).toHaveLength(0)
    })

    it('emits error when process outputs no XML', async () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      const emitter = nmapService.startDiscoveryScan('scan-err', 'sess-1', {
        target: '192.168.1.0/24',
        mode: 'quick',
      })

      const error = new Promise<Error>(resolve => emitter.on('error', resolve))

      proc.stdout.push('nmap: command not found\n')
      proc.stdout.push(null)
      proc.emit('close', 127)

      const err = await error
      expect(err).toBeInstanceOf(Error)
      expect(err.message).toMatch(/no XML/i)
    })

    it('emits progress from stderr "About X% done" lines', async () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      const emitter = nmapService.startDiscoveryScan('scan-prg', 'sess-1', {
        target: '192.168.1.0/24',
        mode: 'quick',
      })

      const progress: any[] = []
      emitter.on('progress', p => progress.push(p))

      // PassThrough streams in flowing mode emit 'data' synchronously on push
      proc.stderr.push('About 42.3% done; ETC: 12:00:00 (0:00:30 remaining)\n')

      // Small async yield to ensure event loop has flushed
      await new Promise(r => setTimeout(r, 20))

      expect(progress).toHaveLength(1)
      expect(progress[0].phase).toBe('scanning')
      expect(progress[0].percent).toBeCloseTo(42.3)
    })
  })

  // -------------------------------------------------------------------------
  // stopScan
  // -------------------------------------------------------------------------

  describe('stopScan', () => {
    it('returns false for an unknown scan ID', () => {
      expect(nmapService.stopScan('nonexistent-scan-id')).toBe(false)
    })

    it('kills the child process with SIGTERM and returns true', () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      nmapService.startDiscoveryScan('scan-kill', 'sess-1', {
        target: '10.0.0.1',
        mode: 'quick',
      })

      const result = nmapService.stopScan('scan-kill')

      expect(result).toBe(true)
      expect(proc.kill).toHaveBeenCalledWith('SIGTERM')
    })

    it('returns false after the same scan ID is stopped a second time', () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      nmapService.startDiscoveryScan('scan-double-kill', 'sess-1', {
        target: '10.0.0.1',
        mode: 'quick',
      })

      nmapService.stopScan('scan-double-kill')
      // Second call: process was deleted from the map on first stop
      expect(nmapService.stopScan('scan-double-kill')).toBe(false)
    })
  })
})
