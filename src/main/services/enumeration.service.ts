import { EventEmitter } from 'events'
import * as dns from 'dns/promises'
import { logger } from '@main/utils/logger'

export interface DirectoryResult {
  path: string
  status: number
  length: number
  redirectUrl?: string
}

export interface DnsResult {
  host: string
  recordType: string
  value: string
}

export interface EnumProgress {
  percent: number
  count: number
  total: number
}

const DEFAULT_DIR_WORDLIST = [
  'admin', 'login', 'wp-admin', 'api', 'config', 'db', 'assets', 'img', 'js', 
  'backup', 'index.html', 'robots.txt', 'sitemap.xml', '.git', '.env', 'uploads', 
  'temp', 'dev', 'test', 'dashboard', 'user', 'v1', 'v2', 'shell', 'upload', 
  'static', 'images', 'css', 'wp-content', 'wp-includes', 'includes', 'cgi-bin',
  'private', 'secure', 'admin.php', 'login.php', 'index.php', 'info.php', 'status'
]

const DEFAULT_SUB_WORDLIST = [
  'www', 'mail', 'dev', 'stage', 'blog', 'api', 'admin', 'test', 'secure', 'vpn', 
  'shop', 'portal', 'dns', 'ns1', 'ns2', 'ftp', 'webmail', 'support', 'cloud', 
  'autodiscover', 'cpanel', 'm', 'en', 'static', 'images', 'git', 'devops', 
  'monitor', 'status', 'auth', 'login', 'db', 'mysql', 'postgres', 'local'
]

class EnumerationService {
  private activeScans = new Map<string, boolean>() // scanId -> isActive

  /**
   * Run active HTTP directory enumeration on the target base URL.
   */
  startDirectoryEnum(scanId: string, targetUrl: string, customWordlist?: string[]): EventEmitter {
    const emitter = new EventEmitter()
    this.activeScans.set(scanId, true)

    // Normalize URL
    let baseUrl = targetUrl.trim()
    if (!/^https?:\/\//i.test(baseUrl)) {
      baseUrl = 'http://' + baseUrl
    }
    // Remove trailing slash
    baseUrl = baseUrl.replace(/\/+$/, '')

    const wordlist = customWordlist && customWordlist.length > 0 ? customWordlist : DEFAULT_DIR_WORDLIST

    // Run async loop
    process.nextTick(async () => {
      logger.info(`[enum] Starting directory scan ${scanId} on ${baseUrl}`)
      try {
        for (let i = 0; i < wordlist.length; i++) {
          if (!this.activeScans.get(scanId)) {
            logger.info(`[enum] Directory scan ${scanId} stopped`)
            emitter.emit('complete', { success: true, message: 'Scan stopped by user' })
            return
          }

          const word = wordlist[i]
          const url = `${baseUrl}/${word}`

          try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 2500)

            const res = await fetch(url, {
              method: 'GET',
              headers: { 'User-Agent': 'NetSentinel-Audit-Agent/1.0' },
              redirect: 'manual', // do not auto-follow redirects, report 301/302
              signal: controller.signal
            })
            clearTimeout(timeoutId)

            // We report any response, but typically interested in 200, 301/302, 403, 500
            // We can filter out 404 in the UI or report everything
            emitter.emit('result', {
              path: `/${word}`,
              status: res.status,
              length: Number(res.headers.get('content-length') || 0),
              redirectUrl: res.headers.get('location') || undefined
            } as DirectoryResult)

          } catch (err: any) {
            // Ignore normal network timeout / 404 connection errors for individual paths
            logger.debug(`[enum] Path /${word} fetch failed: ${err.message || err}`)
          }

          emitter.emit('progress', {
            percent: Math.round(((i + 1) / wordlist.length) * 100),
            count: i + 1,
            total: wordlist.length
          } as EnumProgress)

          // Smooth execution pacing (20ms delay)
          await new Promise(resolve => setTimeout(resolve, 20))
        }

        emitter.emit('complete', { success: true, message: 'Scan completed successfully' })
      } catch (err: any) {
        logger.error(`[enum] Directory scan ${scanId} failed: ${err}`)
        emitter.emit('error', err)
      } finally {
        this.activeScans.delete(scanId)
      }
    })

    return emitter
  }

  /**
   * Stop an active enumeration scan.
   */
  stopScan(scanId: string): boolean {
    if (this.activeScans.has(scanId)) {
      this.activeScans.set(scanId, false)
      return true
    }
    return false
  }

  /**
   * Run active DNS record and subdomain discovery.
   */
  startDnsEnum(scanId: string, domain: string): EventEmitter {
    const emitter = new EventEmitter()
    this.activeScans.set(scanId, true)

    const targetDomain = domain.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '')

    process.nextTick(async () => {
      logger.info(`[enum] Starting DNS scan ${scanId} on ${targetDomain}`)
      try {
        const recordTypes = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME']
        let resolvedCount = 0
        const totalSteps = recordTypes.length + DEFAULT_SUB_WORDLIST.length

        // Phase 1: Standard Records Resolving
        for (const type of recordTypes) {
          if (!this.activeScans.get(scanId)) {
            emitter.emit('complete', { success: true, message: 'Scan stopped by user' })
            return
          }

          try {
            const records = await dns.resolve(targetDomain, type)
            if (records && records.length > 0) {
              for (const record of records) {
                let val = ''
                if (typeof record === 'string') {
                  val = record
                } else if (Array.isArray(record)) {
                  val = record.join(' ')
                } else {
                  val = JSON.stringify(record)
                }

                emitter.emit('result', {
                  host: targetDomain,
                  recordType: type,
                  value: val
                } as DnsResult)
              }
            }
          } catch {
            // DNS resolve fails if record type is not found, ignore
          }

          resolvedCount++
          emitter.emit('progress', {
            percent: Math.round((resolvedCount / totalSteps) * 100),
            count: resolvedCount,
            total: totalSteps
          } as EnumProgress)
        }

        // Phase 2: Subdomain Bruteforcing
        for (let i = 0; i < DEFAULT_SUB_WORDLIST.length; i++) {
          if (!this.activeScans.get(scanId)) {
            emitter.emit('complete', { success: true, message: 'Scan stopped by user' })
            return
          }

          const sub = DEFAULT_SUB_WORDLIST[i]
          const fqdn = `${sub}.${targetDomain}`

          try {
            const ips = await dns.resolve4(fqdn)
            if (ips && ips.length > 0) {
              for (const ip of ips) {
                emitter.emit('result', {
                  host: fqdn,
                  recordType: 'A',
                  value: ip
                } as DnsResult)
              }
            }
          } catch {
            // No record, ignore
          }

          resolvedCount++
          emitter.emit('progress', {
            percent: Math.round((resolvedCount / totalSteps) * 100),
            count: resolvedCount,
            total: totalSteps
          } as EnumProgress)

          // Smooth pacing
          await new Promise(resolve => setTimeout(resolve, 10))
        }

        emitter.emit('complete', { success: true, message: 'Scan completed successfully' })
      } catch (err: any) {
        logger.error(`[enum] DNS scan ${scanId} failed: ${err}`)
        emitter.emit('error', err)
      } finally {
        this.activeScans.delete(scanId)
      }
    })

    return emitter
  }
}

export const enumerationService = new EnumerationService()
