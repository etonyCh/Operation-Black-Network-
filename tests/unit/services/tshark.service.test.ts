import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'events'
import { PassThrough } from 'stream'

vi.mock('child_process', () => ({
  spawn: vi.fn(),
}))

import { spawn } from 'child_process'
import { tsharkService } from '@main/services/tshark.service'
import type { TrafficPacket, Credential, TrafficAlert } from '@shared/types/traffic.types'

// ---------------------------------------------------------------------------
// EK JSON lines (from tests/fixtures/tshark-ek.ndjson, inlined for precision)
// ---------------------------------------------------------------------------

const EK_LINE_HTTP =
  '{"timestamp":1720000000000,"layers":{"frame":{"frame-len":[74],"frame-time_epoch":["1720000000.000000"]},"ip":{"ip-src":["192.168.1.50"],"ip-dst":["93.184.216.34"]},"tcp":{"tcp-srcport":["54321"],"tcp-dstport":["80"]},"_ws_col_info":["GET / HTTP/1.1"],"frame_protocols":["eth:ethertype:ip:tcp:http"]}}'

const EK_LINE_HTTP_AUTH =
  '{"timestamp":1720000001000,"layers":{"frame":{"frame-len":[200],"frame-time_epoch":["1720000001.000000"]},"ip":{"ip-src":["192.168.1.50"],"ip-dst":["192.168.1.10"]},"tcp":{"tcp-srcport":["56789"],"tcp-dstport":["80"]},"http":{"http-authorization":["Basic dXNlcjpwYXNzd29yZA=="],"http-request-method":["GET"]},"_ws_col_info":["GET /admin HTTP/1.1"],"frame_protocols":["eth:ethertype:ip:tcp:http"]}}'

// base64 "dXNlcjpwYXNzd29yZA==" decodes to "user:password"

const EK_LINE_FTP_USER =
  '{"timestamp":1720000002000,"layers":{"frame":{"frame-len":[50],"frame-time_epoch":["1720000002.000000"]},"ip":{"ip-src":["192.168.1.50"],"ip-dst":["192.168.1.20"]},"tcp":{"tcp-srcport":["12345"],"tcp-dstport":["21"]},"ftp":{"ftp-request-command":["USER"],"ftp-request-arg":["ftpuser"]},"_ws_col_info":["Request: USER ftpuser"],"frame_protocols":["eth:ethertype:ip:tcp:ftp"]}}'

const EK_LINE_FTP_PASS =
  '{"timestamp":1720000003000,"layers":{"frame":{"frame-len":[52],"frame-time_epoch":["1720000003.000000"]},"ip":{"ip-src":["192.168.1.50"],"ip-dst":["192.168.1.20"]},"tcp":{"tcp-srcport":["12345"],"tcp-dstport":["21"]},"ftp":{"ftp-request-command":["PASS"],"ftp-request-arg":["secretpass"]},"_ws_col_info":["Request: PASS secretpass"],"frame_protocols":["eth:ethertype:ip:tcp:ftp"]}}'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockProcess() {
  const proc = new EventEmitter() as any
  proc.stdout = new PassThrough()
  proc.stderr = new PassThrough()
  proc.kill = vi.fn()
  return proc
}

/** Push a single EK line (newline-terminated) to mock stdout and flush. */
function pushLine(proc: any, line: string) {
  proc.stdout.push(line + '\n')
}

describe('TsharkService', () => {
  beforeEach(() => {
    // Use fake timers so the stats interval does not fire unexpectedly
    vi.useFakeTimers()
    vi.mocked(spawn).mockReset()
    // Ensure no leftover capture from a previous test
    tsharkService.stopCapture()
  })

  afterEach(() => {
    tsharkService.stopCapture()
    vi.useRealTimers()
  })

  // -------------------------------------------------------------------------
  // startCapture — spawn arguments
  // -------------------------------------------------------------------------

  describe('startCapture', () => {
    it('calls spawn with "tshark" binary', () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      tsharkService.startCapture('sess-1', 'eth0')

      expect(spawn).toHaveBeenCalledWith('tshark', expect.any(Array), expect.any(Object))
    })

    it('passes the interface via -i flag', () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      tsharkService.startCapture('sess-1', 'eth0')

      const args = vi.mocked(spawn).mock.calls[0][1] as string[]
      expect(args).toContain('-i')
      expect(args[args.indexOf('-i') + 1]).toBe('eth0')
    })

    it('appends BPF filter via -f flag when filter is provided', () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      tsharkService.startCapture('sess-1', 'eth0', 'tcp port 80')

      const args = vi.mocked(spawn).mock.calls[0][1] as string[]
      expect(args).toContain('-f')
      expect(args[args.indexOf('-f') + 1]).toBe('tcp port 80')
    })

    it('does NOT include -f flag when no filter is provided', () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      tsharkService.startCapture('sess-1', 'eth0')

      const args = vi.mocked(spawn).mock.calls[0][1] as string[]
      expect(args).not.toContain('-f')
    })

    // -------------------------------------------------------------------------
    // Packet emission
    // -------------------------------------------------------------------------

    it('emits a "packet" event for each valid EK JSON line', () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      const emitter = tsharkService.startCapture('sess-pkt', 'eth0')
      const packets: TrafficPacket[] = []
      emitter.on('packet', p => packets.push(p))

      pushLine(proc, EK_LINE_HTTP)
      pushLine(proc, EK_LINE_HTTP_AUTH)
      pushLine(proc, EK_LINE_FTP_USER)
      pushLine(proc, EK_LINE_FTP_PASS)

      expect(packets).toHaveLength(4)
    })

    it('packet from plain HTTP line has correct srcIp, dstIp, protocol, and length', () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      const emitter = tsharkService.startCapture('sess-http', 'eth0')
      const packets: TrafficPacket[] = []
      emitter.on('packet', p => packets.push(p))

      pushLine(proc, EK_LINE_HTTP)

      expect(packets).toHaveLength(1)
      const pkt = packets[0]
      expect(pkt.srcIp).toBe('192.168.1.50')
      expect(pkt.dstIp).toBe('93.184.216.34')
      // eth:ethertype:ip:tcp:http → last segment → 'http'.toUpperCase() = 'HTTP'
      expect(pkt.protocol).toBe('HTTP')
      expect(pkt.length).toBe(74)
    })

    it('packet srcPort and dstPort are parsed correctly', () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      const emitter = tsharkService.startCapture('sess-ports', 'eth0')
      const packets: TrafficPacket[] = []
      emitter.on('packet', p => packets.push(p))

      pushLine(proc, EK_LINE_HTTP)

      const pkt = packets[0]
      expect(pkt.srcPort).toBe(54321)
      expect(pkt.dstPort).toBe(80)
    })

    it('ignores lines that do not start with "{"', () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      const emitter = tsharkService.startCapture('sess-skip', 'eth0')
      const packets: TrafficPacket[] = []
      emitter.on('packet', p => packets.push(p))

      proc.stdout.push('Capturing on eth0\n')
      proc.stdout.push('  Index  frame  0\n')
      pushLine(proc, EK_LINE_HTTP)

      expect(packets).toHaveLength(1)
    })

    // -------------------------------------------------------------------------
    // HTTP Basic Auth credential detection
    // -------------------------------------------------------------------------

    it('HTTP Basic Auth line emits a "credential" with decoded username and password', () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      const emitter = tsharkService.startCapture('sess-cred', 'eth0')
      const creds: Credential[] = []
      emitter.on('credential', c => creds.push(c))

      pushLine(proc, EK_LINE_HTTP_AUTH)

      expect(creds).toHaveLength(1)
      // Base64 "dXNlcjpwYXNzd29yZA==" → "user:password"
      expect(creds[0].username).toBe('user')
      expect(creds[0].password).toBe('password')
      expect(creds[0].protocol).toBe('HTTP')
    })

    it('HTTP Basic Auth line emits an "alert" with type CLEARTEXT_CREDENTIALS', () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      const emitter = tsharkService.startCapture('sess-alert', 'eth0')
      const alerts: TrafficAlert[] = []
      emitter.on('alert', a => alerts.push(a))

      pushLine(proc, EK_LINE_HTTP_AUTH)

      expect(alerts).toHaveLength(1)
      expect(alerts[0].type).toBe('CLEARTEXT_CREDENTIALS')
      expect(alerts[0].severity).toBe('high')
      expect(alerts[0].srcIp).toBe('192.168.1.50')
      expect(alerts[0].dstIp).toBe('192.168.1.10')
    })

    it('HTTP Basic Auth packet also emits a "packet" event (packet + credential + alert)', () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      const emitter = tsharkService.startCapture('sess-all', 'eth0')
      const packets: TrafficPacket[] = []
      const creds: Credential[] = []
      const alerts: TrafficAlert[] = []
      emitter.on('packet', p => packets.push(p))
      emitter.on('credential', c => creds.push(c))
      emitter.on('alert', a => alerts.push(a))

      pushLine(proc, EK_LINE_HTTP_AUTH)

      expect(packets).toHaveLength(1)
      expect(creds).toHaveLength(1)
      expect(alerts).toHaveLength(1)
    })

    // -------------------------------------------------------------------------
    // FTP credential detection
    // -------------------------------------------------------------------------

    it('FTP USER command emits credential with username', () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      const emitter = tsharkService.startCapture('sess-ftp-user', 'eth0')
      const creds: Credential[] = []
      emitter.on('credential', c => creds.push(c))

      pushLine(proc, EK_LINE_FTP_USER)

      expect(creds).toHaveLength(1)
      expect(creds[0].username).toBe('ftpuser')
      expect(creds[0].protocol).toBe('FTP')
      expect(creds[0].password).toBeUndefined()
    })

    it('FTP PASS command emits credential with password', () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      const emitter = tsharkService.startCapture('sess-ftp-pass', 'eth0')
      const creds: Credential[] = []
      emitter.on('credential', c => creds.push(c))

      pushLine(proc, EK_LINE_FTP_PASS)

      expect(creds).toHaveLength(1)
      expect(creds[0].password).toBe('secretpass')
      expect(creds[0].protocol).toBe('FTP')
      expect(creds[0].username).toBeUndefined()
    })

    it('FTP protocol packet has protocol set to "FTP"', () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      const emitter = tsharkService.startCapture('sess-ftp-proto', 'eth0')
      const packets: TrafficPacket[] = []
      emitter.on('packet', p => packets.push(p))

      pushLine(proc, EK_LINE_FTP_USER)

      expect(packets[0].protocol).toBe('FTP')
    })
  })

  // -------------------------------------------------------------------------
  // stopCapture
  // -------------------------------------------------------------------------

  describe('stopCapture', () => {
    it('kills the capture process with SIGTERM', () => {
      const proc = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc)

      tsharkService.startCapture('sess-stop', 'eth0')
      tsharkService.stopCapture()

      expect(proc.kill).toHaveBeenCalledWith('SIGTERM')
    })

    it('is safe to call when no capture is running', () => {
      // captureProcess is null — should not throw
      expect(() => tsharkService.stopCapture()).not.toThrow()
    })

    it('a second startCapture call stops the previous capture first', () => {
      const proc1 = createMockProcess()
      const proc2 = createMockProcess()
      vi.mocked(spawn).mockReturnValueOnce(proc1).mockReturnValueOnce(proc2)

      tsharkService.startCapture('sess-a', 'eth0')
      tsharkService.startCapture('sess-b', 'eth1') // should auto-stop proc1

      expect(proc1.kill).toHaveBeenCalledWith('SIGTERM')
    })
  })
})
