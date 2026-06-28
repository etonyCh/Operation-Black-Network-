import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import type { Vulnerability } from '@shared/types/vulnerability.types'

// ---------------------------------------------------------------------------
// Mock global fetch BEFORE any module is imported
// ---------------------------------------------------------------------------

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NVD_FIXTURE = JSON.parse(
  readFileSync(resolve(__dirname, '../../fixtures/nvd-cve-response.json'), 'utf-8')
)

// Convenience: make a mock Response object that fetch can return
function makeOkResponse(body: unknown) {
  return { ok: true, json: () => Promise.resolve(body) }
}

function makeBadResponse(status: number) {
  return { ok: false, status }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeVuln(overrides: Partial<Vulnerability> = {}): Vulnerability {
  return {
    id: 'vuln-test-id',
    deviceId: 'device-test-id',
    sessionId: 'session-test-id',
    title: 'Test Vulnerability',
    description: 'A placeholder vulnerability',
    severity: 'medium',
    discoveredAt: 0,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Test suite
// We use vi.resetModules() in beforeEach so each test gets a fresh NvdService
// instance with an empty cache, and vi.useFakeTimers() to skip the 650ms
// REQUEST_DELAY_MS sleep between CVE fetches.
// ---------------------------------------------------------------------------

describe('NvdService', () => {
  // Dynamically imported per-test to get a fresh singleton with empty cache
  let nvdService: { enrichMultiple: (vulns: Vulnerability[]) => Promise<Vulnerability[]> }

  beforeEach(async () => {
    vi.useFakeTimers()
    mockFetch.mockReset()
    vi.resetModules()
    const mod = await import('@main/services/nvd.service')
    nvdService = mod.nvdService
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // -------------------------------------------------------------------------
  // Basic shape / pass-through
  // -------------------------------------------------------------------------

  it('enrichMultiple returns an array of the same length as input', async () => {
    mockFetch.mockResolvedValue(makeOkResponse(NVD_FIXTURE))

    const vulns = [
      makeVuln({ id: 'v1', cveId: 'CVE-2021-41773' }),
      makeVuln({ id: 'v2' }), // no cveId
    ]

    const p = nvdService.enrichMultiple(vulns)
    await vi.runAllTimersAsync()
    const result = await p

    expect(result).toHaveLength(2)
  })

  it('vulns without cveId are returned unchanged', async () => {
    const vuln = makeVuln({ id: 'no-cve', cveId: undefined })

    const p = nvdService.enrichMultiple([vuln])
    await vi.runAllTimersAsync()
    const result = await p

    expect(result[0]).toEqual(vuln)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // CVE enrichment — CVE-2021-41773 (score 9.8, critical)
  // -------------------------------------------------------------------------

  it('updates cvss.score from NVD data (9.8 for CVE-2021-41773)', async () => {
    mockFetch.mockResolvedValue(makeOkResponse(NVD_FIXTURE))

    const vuln = makeVuln({ cveId: 'CVE-2021-41773' })
    const p = nvdService.enrichMultiple([vuln])
    await vi.runAllTimersAsync()
    const [enriched] = await p

    expect(enriched.cvss).toBeDefined()
    expect(enriched.cvss!.score).toBe(9.8)
  })

  it('updates severity to "critical" when cvss score >= 9.0', async () => {
    mockFetch.mockResolvedValue(makeOkResponse(NVD_FIXTURE))

    const vuln = makeVuln({ cveId: 'CVE-2021-41773', severity: 'low' })
    const p = nvdService.enrichMultiple([vuln])
    await vi.runAllTimersAsync()
    const [enriched] = await p

    expect(enriched.severity).toBe('critical')
  })

  it('updates cvss.version to "3.1"', async () => {
    mockFetch.mockResolvedValue(makeOkResponse(NVD_FIXTURE))

    const vuln = makeVuln({ cveId: 'CVE-2021-41773' })
    const p = nvdService.enrichMultiple([vuln])
    await vi.runAllTimersAsync()
    const [enriched] = await p

    expect(enriched.cvss!.version).toBe('3.1')
  })

  it('updates description with the English NVD description', async () => {
    mockFetch.mockResolvedValue(makeOkResponse(NVD_FIXTURE))

    const vuln = makeVuln({ cveId: 'CVE-2021-41773', description: 'old description' })
    const p = nvdService.enrichMultiple([vuln])
    await vi.runAllTimersAsync()
    const [enriched] = await p

    // NVD fixture English description mentions path traversal
    expect(enriched.description).toContain('path traversal')
    expect(enriched.description).not.toBe('old description')
  })

  it('updates references from NVD data', async () => {
    mockFetch.mockResolvedValue(makeOkResponse(NVD_FIXTURE))

    const vuln = makeVuln({ cveId: 'CVE-2021-41773', references: [] })
    const p = nvdService.enrichMultiple([vuln])
    await vi.runAllTimersAsync()
    const [enriched] = await p

    expect(enriched.references).toBeDefined()
    expect(enriched.references!.length).toBeGreaterThan(0)
    expect(enriched.references![0]).toContain('apache.org')
  })

  it('does NOT mutate the original vulnerability object', async () => {
    mockFetch.mockResolvedValue(makeOkResponse(NVD_FIXTURE))

    const vuln = makeVuln({ cveId: 'CVE-2021-41773', severity: 'low' })
    const originalSeverity = vuln.severity

    const p = nvdService.enrichMultiple([vuln])
    await vi.runAllTimersAsync()
    await p

    expect(vuln.severity).toBe(originalSeverity)
  })

  // -------------------------------------------------------------------------
  // Caching
  // -------------------------------------------------------------------------

  it('calling enrichMultiple twice with the same CVE only fetches once', async () => {
    mockFetch.mockResolvedValue(makeOkResponse(NVD_FIXTURE))

    const vuln = makeVuln({ cveId: 'CVE-2021-41773' })

    // First call: cache miss → fetch
    const p1 = nvdService.enrichMultiple([vuln])
    await vi.runAllTimersAsync()
    await p1

    // Second call: cache hit → no fetch
    const p2 = nvdService.enrichMultiple([vuln])
    await vi.runAllTimersAsync()
    await p2

    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('deduplicates multiple vulns with the same CVE ID into a single fetch', async () => {
    mockFetch.mockResolvedValue(makeOkResponse(NVD_FIXTURE))

    const vulns = [
      makeVuln({ id: 'v1', cveId: 'CVE-2021-41773' }),
      makeVuln({ id: 'v2', cveId: 'CVE-2021-41773' }),
    ]

    const p = nvdService.enrichMultiple(vulns)
    await vi.runAllTimersAsync()
    const result = await p

    expect(mockFetch).toHaveBeenCalledTimes(1)
    // Both vulns should be enriched
    expect(result[0].cvss!.score).toBe(9.8)
    expect(result[1].cvss!.score).toBe(9.8)
  })

  // -------------------------------------------------------------------------
  // URL correctness
  // -------------------------------------------------------------------------

  it('calls fetch with the correct NVD API URL for the CVE ID', async () => {
    mockFetch.mockResolvedValue(makeOkResponse(NVD_FIXTURE))

    const vuln = makeVuln({ cveId: 'CVE-2021-41773' })
    const p = nvdService.enrichMultiple([vuln])
    await vi.runAllTimersAsync()
    await p

    expect(mockFetch).toHaveBeenCalledWith(
      'https://services.nvd.nist.gov/rest/json/cves/2.0?cveId=CVE-2021-41773',
      expect.any(Object)
    )
  })

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------

  it('returns the original vuln unchanged when fetch throws', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    const vuln = makeVuln({ cveId: 'CVE-2021-41773', severity: 'medium' })
    const p = nvdService.enrichMultiple([vuln])
    await vi.runAllTimersAsync()
    const [result] = await p

    // Unchanged: original vuln fields preserved
    expect(result.severity).toBe('medium')
    expect(result.cvss).toBeUndefined()
  })

  it('returns the original vuln unchanged when the API responds with an HTTP error', async () => {
    mockFetch.mockResolvedValueOnce(makeBadResponse(404))

    const vuln = makeVuln({ cveId: 'CVE-2021-41773', description: 'original description' })
    const p = nvdService.enrichMultiple([vuln])
    await vi.runAllTimersAsync()
    const [result] = await p

    expect(result.description).toBe('original description')
    expect(result.cvss).toBeUndefined()
  })

  it('continues enriching remaining vulns even after a fetch failure for one', async () => {
    // First CVE fails, second succeeds
    mockFetch
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValueOnce(makeOkResponse(NVD_FIXTURE))

    const vulns = [
      makeVuln({ id: 'v1', cveId: 'CVE-1999-0001', severity: 'low' }),
      makeVuln({ id: 'v2', cveId: 'CVE-2021-41773', severity: 'low' }),
    ]

    const p = nvdService.enrichMultiple(vulns)
    await vi.runAllTimersAsync()
    const result = await p

    // v1 failed → unchanged
    expect(result[0].severity).toBe('low')
    // v2 succeeded → enriched to critical
    expect(result[1].severity).toBe('critical')
  })
})
