import { ChildProcess } from 'child_process'
import { logger } from './logger'

class ProcessManager {
  private readonly processes = new Map<string, ChildProcess>()

  register(id: string, proc: ChildProcess): void {
    this.processes.set(id, proc)
    proc.once('exit', () => {
      this.processes.delete(id)
    })
  }

  kill(id: string): boolean {
    const proc = this.processes.get(id)
    if (!proc) return false
    try {
      proc.kill('SIGTERM')
      const killTimer = setTimeout(() => {
        if (!proc.killed) {
          proc.kill('SIGKILL')
          logger.warn(`Force-killed process ${id} with SIGKILL`)
        }
      }, 3000)
      killTimer.unref()
      this.processes.delete(id)
      return true
    } catch (err) {
      logger.error(`Failed to kill process ${id}: ${err}`)
      return false
    }
  }

  killAll(): void {
    for (const id of this.processes.keys()) {
      this.kill(id)
    }
  }

  isRunning(id: string): boolean {
    const proc = this.processes.get(id)
    return proc != null && !proc.killed
  }

  getPid(id: string): number | undefined {
    return this.processes.get(id)?.pid
  }
}

export const processManager = new ProcessManager()
