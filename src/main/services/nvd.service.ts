import { logger } from '@main/utils/logger'
import type { Vulnerability, CVSS, Severity } from '@shared/types/vulnerability.types'

const NVD_API_BASE = 'https://services.nvd.nist.gov/rest/json/cves/2.0'
const REQUEST_DELAY_MS = 650 // NVD rate-limit: ~6 req/s without an API key

interface NvdCveItem {
  cve: {
    id: string
    descriptions: { lang: string; value: string }[]
    metrics?: {
      cvssMetricV31?: Array<{ cvssData: { baseScore: number; vectorString: string } }>
      cvssMetricV30?: Array<{ cvssData: { baseScore: number; vectorString: string } }>
      cvssMetricV2?: Array<{ cvssData: { baseScore: number; vectorString: string } }>
    }
    references?: { url: string }[]
    weaknesses?: { description: { lang: string; value: string }[] }[]
  }
}

interface NvdResponse {
  totalResults: number
  vulnerabilities: NvdCveItem[]
}

function scoreToSeverity(score: number): Severity {
  if (score >= 9.0) return 'critical'
  if (score >= 7.0) return 'high'
  if (score >= 4.0) return 'medium'
  if (score > 0) return 'low'
  return 'info'
}

function extractCvss(item: NvdCveItem): CVSS | undefined {
  const v31 = item.cve.metrics?.cvssMetricV31?.[0]
  if (v31)
    return { score: v31.cvssData.baseScore, vector: v31.cvssData.vectorString, version: '3.1' }
  const v30 = item.cve.metrics?.cvssMetricV30?.[0]
  if (v30)
    return { score: v30.cvssData.baseScore, vector: v30.cvssData.vectorString, version: '3.0' }
  const v2 = item.cve.metrics?.cvssMetricV2?.[0]
  if (v2) return { score: v2.cvssData.baseScore, vector: v2.cvssData.vectorString, version: '2.0' }
  return undefined
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchCve(cveId: string): Promise<NvdCveItem | null> {
  const url = `${NVD_API_BASE}?cveId=${encodeURIComponent(cveId)}`
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)
    const resp = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!resp.ok) {
      logger.warn(`[nvd] HTTP ${resp.status} for ${cveId}`)
      return null
    }

    const data = (await resp.json()) as NvdResponse
    return data.vulnerabilities?.[0] ?? null
  } catch (err) {
    logger.warn(`[nvd] fetch failed for ${cveId}: ${err}`)
    return null
  }
}

class NvdService {
  private cache = new Map<string, NvdCveItem | null>()

  /**
   * Enrich vulnerabilities that have a CVE ID with data from the NVD API.
   * Returns updated vulnerability objects (originals are not mutated).
   */
  async enrichMultiple(vulns: Vulnerability[]): Promise<Vulnerability[]> {
    const withCve = vulns.filter(v => v.cveId)
    const uniqueCveIds = [...new Set(withCve.map(v => v.cveId!))]

    for (const cveId of uniqueCveIds) {
      if (!this.cache.has(cveId)) {
        const item = await fetchCve(cveId)
        this.cache.set(cveId, item)
        await sleep(REQUEST_DELAY_MS)
      }
    }

    return vulns.map(vuln => {
      if (!vuln.cveId) return vuln
      const item = this.cache.get(vuln.cveId)
      if (!item) return vuln

      const cvss = extractCvss(item)
      const description =
        item.cve.descriptions.find(d => d.lang === 'en')?.value ?? vuln.description
      const references = item.cve.references?.map(r => r.url) ?? vuln.references
      const severity = cvss ? scoreToSeverity(cvss.score) : vuln.severity

      return { ...vuln, cvss, description, references, severity }
    })
  }
}

export const nvdService = new NvdService()
