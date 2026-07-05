import { parseString } from 'xml2js'
import * as crypto from 'crypto'
import type { Device, Port, OSMatch, DeviceType } from '@shared/types/device.types'
import type { Vulnerability, Severity } from '@shared/types/vulnerability.types'

function parseXmlAsync(xml: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    parseString(xml, { explicitArray: true }, (err, result) => {
      if (err) reject(err)
      else resolve(result)
    })
  })
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function arr<T>(val: T | T[] | undefined): T[] {
  if (!val) return []
  return Array.isArray(val) ? val : [val]
}

function attr(node: any): Record<string, string> {
  return node?.$ ?? {}
}

function guessDeviceType(ports: Port[], osMatch?: OSMatch): DeviceType {
  const portNums = new Set(ports.map(p => p.port))
  const os = (osMatch?.name ?? '').toLowerCase()
  const osType = (osMatch?.type ?? '').toLowerCase()
  const osVendor = (osMatch?.vendor ?? '').toLowerCase()

  if (osType === 'router' || os.includes('router') || os.includes('ios') || os.includes('junos'))
    return 'router'
  if (os.includes('android') || os.includes('ios') || os.includes('iphone') || os.includes('ipad'))
    return 'mobile'
  if (os.includes('windows embedded') || osType === 'embedded') return 'iot'
  if (portNums.has(9100) || portNums.has(515) || portNums.has(631)) return 'printer'
  if (portNums.has(554) || portNums.has(8554)) return 'camera'
  if (portNums.has(161) || portNums.has(162)) return 'switch'
  if (portNums.has(22) || portNums.has(3389) || portNums.has(443) || portNums.has(80))
    return 'server'
  if (
    os.includes('linux') ||
    os.includes('windows') ||
    os.includes('macos') ||
    os.includes('mac os')
  )
    return 'workstation'
  return 'unknown'
}

// ---------------------------------------------------------------------------
// Vuln script parsing
// ---------------------------------------------------------------------------

const SEVERITY_MAP: Record<string, Severity> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
  info: 'info',
}

function parseVulnScript(
  scriptNode: any,
  deviceId: string,
  sessionId: string,
  port?: number,
  service?: string
): Vulnerability[] {
  const vulns: Vulnerability[] = []
  const tables = arr(scriptNode?.table)

  for (const table of tables) {
    const elems: Record<string, string> = {}
    for (const elem of arr(table?.elem)) {
      const key = attr(elem)['key']
      const val = typeof elem === 'string' ? elem : (elem._ ?? '')
      if (key) elems[key] = val
    }

    const state = elems['state']?.toLowerCase() ?? ''
    if (!state.includes('vulnerable') && !state.includes('likely')) continue

    const cveMatch = (elems['ids'] ?? attr(table)['key'] ?? '').match(/CVE-[\d-]+/i)
    const cveId = cveMatch?.[0]?.toUpperCase()
    const riskFactor = elems['risk_factor']?.toLowerCase() ?? 'medium'
    const severity: Severity = SEVERITY_MAP[riskFactor] ?? 'medium'

    vulns.push({
      id: crypto.randomUUID(),
      deviceId,
      sessionId,
      cveId,
      title: elems['title'] ?? cveId ?? attr(table)['key'] ?? 'Unknown Vulnerability',
      description: elems['description'] ?? '',
      severity,
      port,
      service,
      solution: elems['fix'] ?? elems['solution'] ?? undefined,
      references: elems['references'] ? [elems['references']] : undefined,
      exploitAvailable: state.includes('exploit'),
      discoveredAt: Date.now(),
    })
  }

  return vulns
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface NmapParseResult {
  devices: Device[]
  vulnerabilities: Vulnerability[]
}

export async function parseNmapXml(xmlData: string, sessionId: string): Promise<NmapParseResult> {
  if (!xmlData.trim()) return { devices: [], vulnerabilities: [] }

  const parsed = (await parseXmlAsync(xmlData)) as any
  const devices: Device[] = []
  const vulnerabilities: Vulnerability[] = []

  const hosts = arr(parsed?.nmaprun?.host)

  for (const host of hosts) {
    const status = attr(arr(host.status)[0])['state']
    if (status !== 'up') continue

    const addresses = arr(host.address)
    let ip = ''
    let mac: string | undefined
    let vendor: string | undefined

    for (const addrNode of addresses) {
      const a = attr(addrNode)
      if (a['addrtype'] === 'ipv4') ip = a['addr']
      else if (a['addrtype'] === 'mac') {
        mac = a['addr']
        vendor = a['vendor'] || undefined
      }
    }
    if (!ip) continue

    // Hostname
    let hostname: string | undefined
    const hostnameNodes = arr(arr(host.hostnames)[0]?.hostname)
    if (hostnameNodes.length > 0) hostname = attr(hostnameNodes[0])['name'] || undefined

    // Ports
    const ports: Port[] = []
    for (const portNode of arr(arr(host.ports)[0]?.port)) {
      const pa = attr(portNode)
      const portNum = parseInt(pa['portid'] ?? '0', 10)
      const proto = pa['protocol'] ?? 'tcp'
      const stateAttr = attr(arr(portNode.state)[0])['state'] ?? 'unknown'
      const svcAttr = attr(arr(portNode.service)[0])

      ports.push({
        port: portNum,
        protocol: proto as 'tcp' | 'udp',
        state: stateAttr as Port['state'],
        service: svcAttr['name'],
        product: svcAttr['product'],
        version: svcAttr['version'],
        extraInfo: svcAttr['extrainfo'],
        cpe: arr(arr(portNode.service)[0]?.cpe).map((c: any) => (typeof c === 'string' ? c : c._)),
      })
    }

    // OS
    let osMatch: OSMatch | undefined
    const osMatches = arr(arr(host.os)[0]?.osmatch)
    if (osMatches.length > 0) {
      const om = osMatches[0]
      const oma = attr(om)
      const osclassAttr = attr(arr(om.osclass)[0])
      osMatch = {
        name: oma['name'] ?? '',
        accuracy: parseInt(oma['accuracy'] ?? '0', 10),
        family: osclassAttr['osfamily'],
        vendor: osclassAttr['vendor'],
        generation: osclassAttr['osgen'],
        type: osclassAttr['type'],
        cpe: arr(arr(om.osclass)[0]?.cpe).map((c: any) => (typeof c === 'string' ? c : c._)),
      }
    }

    // Response time (rtt in microseconds → ms)
    const rttStr = attr(arr(host.times)[0])['rtt']
    const responseTime = rttStr ? Math.round(parseInt(rttStr, 10) / 1000) : undefined

    const deviceId = crypto.randomUUID()
    const device: Device = {
      id: deviceId,
      sessionId,
      ip,
      mac,
      hostname,
      vendor,
      deviceType: guessDeviceType(ports, osMatch),
      status: 'online',
      responseTime,
      ports: ports.length > 0 ? ports : undefined,
      os: osMatch,
      discoveredAt: Date.now(),
      lastSeen: Date.now(),
    }
    devices.push(device)

    // Parse vuln scripts from host-level scripts
    for (const scriptNode of arr(host.hostscript?.[0]?.script)) {
      const vulns = parseVulnScript(scriptNode, deviceId, sessionId)
      vulnerabilities.push(...vulns)
    }

    // Parse vuln scripts from port-level scripts
    for (const portNode of arr(arr(host.ports)[0]?.port)) {
      const pa = attr(portNode)
      const portNum = parseInt(pa['portid'] ?? '0', 10)
      const svcName = attr(arr(portNode.service)[0])['name']
      for (const scriptNode of arr(portNode.script)) {
        const sid = attr(scriptNode)['id'] ?? ''
        if (sid.includes('vuln') || sid.startsWith('CVE')) {
          const vulns = parseVulnScript(scriptNode, deviceId, sessionId, portNum, svcName)
          vulnerabilities.push(...vulns)
        }
      }
    }
  }

  return { devices, vulnerabilities }
}
