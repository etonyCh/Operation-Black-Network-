import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { parseNmapXml } from '@main/utils/xml-parser'

const FIXTURES = resolve(__dirname, '../../fixtures')

describe('parseNmapXml', () => {
  it('returns empty result for empty string', async () => {
    const result = await parseNmapXml('', 'session-test')
    expect(result.devices).toEqual([])
    expect(result.vulnerabilities).toEqual([])
  })

  describe('with nmap-scan.xml fixture (ping scan — 2 up, 1 down)', () => {
    let result: Awaited<ReturnType<typeof parseNmapXml>>
    let rawXml: string

    beforeAll(async () => {
      rawXml = readFileSync(resolve(FIXTURES, 'nmap-scan.xml'), 'utf-8')
      result = await parseNmapXml(rawXml, 'session-test')
    })

    it('returns 2 devices (skips the down host)', () => {
      expect(result.devices).toHaveLength(2)
    })

    it('first device has correct IP 192.168.1.1', () => {
      expect(result.devices[0].ip).toBe('192.168.1.1')
    })

    it('first device has MAC AA:BB:CC:DD:EE:01', () => {
      expect(result.devices[0].mac).toBe('AA:BB:CC:DD:EE:01')
    })

    it('first device vendor is Cisco Systems', () => {
      expect(result.devices[0].vendor).toBe('Cisco Systems')
    })

    it('second device has hostname server.local', () => {
      expect(result.devices[1].hostname).toBe('server.local')
    })

    it('second device has 3 open ports (22, 80, 443)', () => {
      expect(result.devices[1].ports).toHaveLength(3)
      const portNums = result.devices[1].ports!.map(p => p.port)
      expect(portNums).toContain(22)
      expect(portNums).toContain(80)
      expect(portNums).toContain(443)
    })

    it('second device port 22 is ssh service', () => {
      const port22 = result.devices[1].ports!.find(p => p.port === 22)
      expect(port22).toBeDefined()
      expect(port22!.service).toBe('ssh')
    })

    it('second device OS is Linux 5.15 with accuracy 95', () => {
      expect(result.devices[1].os).toBeDefined()
      expect(result.devices[1].os!.name).toBe('Linux 5.15')
      expect(result.devices[1].os!.accuracy).toBe(95)
    })

    it('second device deviceType is server (has port 22/80/443)', () => {
      expect(result.devices[1].deviceType).toBe('server')
    })

    it('responseTime is in milliseconds (rtt 5000μs = 5ms for second device)', () => {
      // rtt="5000" microseconds → Math.round(5000 / 1000) = 5ms
      expect(result.devices[1].responseTime).toBe(5)
    })

    it('returns 0 vulnerabilities for ping scan', () => {
      expect(result.vulnerabilities).toHaveLength(0)
    })
  })

  describe('with nmap-fingerprint.xml fixture (includes vuln script)', () => {
    let result: Awaited<ReturnType<typeof parseNmapXml>>
    let rawXml: string

    beforeAll(async () => {
      rawXml = readFileSync(resolve(FIXTURES, 'nmap-fingerprint.xml'), 'utf-8')
      result = await parseNmapXml(rawXml, 'session-fp')
    })

    it('finds 1 device', () => {
      expect(result.devices).toHaveLength(1)
    })

    it('finds 1 vulnerability from vuln script', () => {
      expect(result.vulnerabilities).toHaveLength(1)
    })

    it('vulnerability cveId is CVE-2021-41773', () => {
      expect(result.vulnerabilities[0].cveId).toBe('CVE-2021-41773')
    })

    it('vulnerability severity is high (from risk_factor)', () => {
      expect(result.vulnerabilities[0].severity).toBe('high')
    })

    it('vulnerability state must include "vulnerable" to be included', async () => {
      // Replace the state so it no longer contains 'vulnerable' or 'likely'
      const notVulnXml = rawXml.replace('VULNERABLE (Exploitable)', 'PATCH AVAILABLE')
      const notVulnResult = await parseNmapXml(notVulnXml, 'session-fp-notvuln')
      expect(notVulnResult.vulnerabilities).toHaveLength(0)
    })
  })
})
