import { logger } from './logger'

const SERVICE_NAME = 'Black Network'

// Lazy-loaded keytar to handle environments where it's unavailable
let keytarModule:
  | {
      getPassword(service: string, account: string): Promise<string | null>
      setPassword(service: string, account: string, password: string): Promise<void>
      deletePassword(service: string, account: string): Promise<boolean>
    }
  | null
  | undefined = undefined

async function loadKeytar() {
  if (keytarModule !== undefined) return keytarModule
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mod = (await import('keytar')) as any
    keytarModule = 'default' in mod ? mod.default : mod
    return keytarModule
  } catch {
    logger.warn('keytar unavailable — falling back to in-memory secret store')
    keytarModule = null
    return null
  }
}

// In-memory fallback for when keytar is not available
const memStore = new Map<string, string>()

export async function getSecret(account: string): Promise<string | null> {
  const kt = await loadKeytar()
  if (kt) return kt.getPassword(SERVICE_NAME, account)
  return memStore.get(account) ?? null
}

export async function setSecret(account: string, value: string): Promise<void> {
  const kt = await loadKeytar()
  if (kt) {
    await kt.setPassword(SERVICE_NAME, account, value)
  } else {
    memStore.set(account, value)
  }
}

export async function deleteSecret(account: string): Promise<boolean> {
  const kt = await loadKeytar()
  if (kt) return kt.deletePassword(SERVICE_NAME, account)
  return memStore.delete(account)
}
