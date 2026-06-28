import { execFile } from 'child_process'
import { promisify } from 'util'
import { logger } from './logger'

const execFileAsync = promisify(execFile)

export interface DependencyStatus {
  name: string
  command: string
  available: boolean
  version?: string
  required: boolean
}

interface DepSpec {
  name: string
  command: string
  required: boolean
  versionArgs: string[]
  versionPattern: RegExp
}

const DEPS: DepSpec[] = [
  {
    name: 'nmap',
    command: 'nmap',
    required: true,
    versionArgs: ['--version'],
    versionPattern: /Nmap version ([\d.]+)/i,
  },
  {
    name: 'tshark',
    command: 'tshark',
    required: true,
    versionArgs: ['--version'],
    versionPattern: /TShark.*?([\d.]+)/i,
  },
  {
    name: 'arp-scan',
    command: 'arp-scan',
    required: true,
    versionArgs: ['--version'],
    versionPattern: /arp-scan\s+([\d.]+)/i,
  },
  {
    name: 'mitmproxy',
    command: 'mitmdump',
    required: false,
    versionArgs: ['--version'],
    versionPattern: /([\d.]+)/,
  },
  {
    name: 'arpspoof',
    command: 'arpspoof',
    required: false,
    versionArgs: [],
    versionPattern: /^$/,
  },
  {
    name: 'pkexec',
    command: 'pkexec',
    required: false,
    versionArgs: ['--version'],
    versionPattern: /([\d.]+)/,
  },
]

async function isInPath(command: string): Promise<boolean> {
  try {
    await execFileAsync('which', [command], { timeout: 3000 })
    return true
  } catch {
    return false
  }
}

async function getVersion(spec: DepSpec): Promise<string | undefined> {
  if (spec.versionArgs.length === 0) return undefined
  try {
    const { stdout, stderr } = await execFileAsync(spec.command, spec.versionArgs, {
      timeout: 5000,
    })
    const output = stdout || stderr
    const match = output.match(spec.versionPattern)
    return match?.[1]
  } catch {
    return undefined
  }
}

export async function checkDependency(spec: DepSpec): Promise<DependencyStatus> {
  const available = await isInPath(spec.command)
  if (!available) {
    return { name: spec.name, command: spec.command, available: false, required: spec.required }
  }
  const version = await getVersion(spec)
  return {
    name: spec.name,
    command: spec.command,
    available: true,
    version,
    required: spec.required,
  }
}

export async function checkAllDependencies(): Promise<DependencyStatus[]> {
  const results = await Promise.all(DEPS.map(checkDependency))
  for (const r of results) {
    if (r.required && !r.available) {
      logger.warn(`Required dependency missing: ${r.name} (${r.command})`)
    } else if (r.available) {
      logger.debug(`Dependency OK: ${r.name} ${r.version ?? ''}`)
    }
  }
  return results
}
