// p0f is a passive OS fingerprinting tool.
// Black Network uses nmap for active fingerprinting; p0f is kept here as an
// optional passive companion. It is not required for core functionality.

import { spawn, ChildProcess } from 'child_process'
import { EventEmitter } from 'events'
import { logger } from '@main/utils/logger'

export interface P0fMatch {
  srcIp: string
  os?: string
  distance?: number
  uptime?: number
}

export interface P0fEmitter extends EventEmitter {
  on(event: 'match', listener: (match: P0fMatch) => void): this
  on(event: 'error', listener: (err: Error) => void): this
}

class P0fService {
  private process: ChildProcess | null = null

  start(iface: string): P0fEmitter {
    const emitter = new EventEmitter() as P0fEmitter
    // p0f outputs to a socket; for simplicity, we use text output mode.
    const args = ['-i', iface, '-o', '/dev/stdout']
    logger.info(`[p0f] starting on ${iface}`)

    const child = spawn('p0f', args, { stdio: ['ignore', 'pipe', 'pipe'] })
    this.process = child

    let buffer = ''
    child.stdout?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString()
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        const match = this.parseLine(line)
        if (match) emitter.emit('match', match)
      }
    })

    child.on('error', err => emitter.emit('error', err))
    child.on('close', code => {
      this.process = null
      if (code !== 0 && code !== null) {
        logger.warn(`[p0f] exited with code ${code}`)
      }
    })

    return emitter
  }

  stop(): void {
    if (this.process) {
      this.process.kill('SIGTERM')
      this.process = null
      logger.info('[p0f] stopped')
    }
  }

  private parseLine(line: string): P0fMatch | null {
    // Typical p0f line: .-[ 192.168.1.5/1234 -> 192.168.1.1/80 (syn) ]-
    //                   | client   = 192.168.1.5/1234
    //                   | os       = Linux 3.11 and newer
    const srcMatch = line.match(/client\s+=\s+([\d.]+)/i)
    const osMatch = line.match(/os\s+=\s+(.+)/i)
    const distMatch = line.match(/distance\s+=\s+(\d+)/i)
    if (!srcMatch) return null
    return {
      srcIp: srcMatch[1],
      os: osMatch?.[1]?.trim(),
      distance: distMatch ? parseInt(distMatch[1], 10) : undefined,
    }
  }
}

export const p0fService = new P0fService()
