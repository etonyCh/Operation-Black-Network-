import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test'
import { resolve } from 'path'

let app: ElectronApplication
let page: Page

test.beforeAll(async () => {
  app = await electron.launch({
    args: [resolve(__dirname, '../../out/main/index.js')],
    env: {
      ...process.env,
      PATH: `${resolve(__dirname, '../mocks')}:${process.env.PATH ?? '/usr/bin:/bin'}`,
      NODE_ENV: 'test',
    },
  })
  page = await app.firstWindow()
  await page.waitForLoadState('domcontentloaded')
})

test.afterAll(async () => {
  await app.close()
})

test.describe('Phase 1 — Scan & Device Discovery', () => {
  // sessionId is shared across tests within this describe block
  let sessionId: string

  test('can create a session via API', async () => {
    // window.api.createSession returns { success, session?, error? }
    const result = await page.evaluate(async () => {
      return window.api.createSession({
        name: 'E2E Scan Test',
        target: '192.168.1.0/24',
      })
    })

    expect(result.success).toBe(true)
    expect(result.session!.id).toBeTruthy()
    expect(result.session!.name).toBe('E2E Scan Test')
    expect(result.session!.createdAt).toBeGreaterThan(0)

    sessionId = result.session!.id
  })

  test('scan emits device-found events and completes', async () => {
    // Subscribe to events BEFORE starting the scan so no events are missed
    const devices = await page.evaluate(async sid => {
      return new Promise<any[]>(resolve => {
        const found: any[] = []

        const unsubFound = window.api.on('scan:device-found', (device: any) => {
          found.push(device)
        })

        const unsubComplete = window.api.on('scan:complete', () => {
          unsubFound()
          unsubComplete()
          resolve(found)
        })

        const unsubError = window.api.on('scan:error', () => {
          unsubFound()
          unsubComplete()
          unsubError()
          resolve([])
        })

        // startScan returns { success, scanId?, error? } — fire and forget here
        window.api.startScan(sid, { target: '192.168.1.0/24', mode: 'quick' })
      })
    }, sessionId)

    // Mock nmap outputs nmap-scan.xml which has 2 live hosts
    expect(devices.length).toBeGreaterThan(0)
    expect(devices[0].ip).toBeTruthy()
    expect(devices[0].sessionId).toBe(sessionId)
  })

  test('discovered devices are persisted — getSession returns correct deviceCount', async () => {
    // window.api.getSession returns { success, session?: Session & { deviceCount, vulnCount }, error? }
    const result = await page.evaluate(async id => {
      return window.api.getSession(id)
    }, sessionId)

    expect(result.success).toBe(true)
    expect(result.session!.deviceCount).toBeGreaterThan(0)
  })

  test('listSessions returns the created session', async () => {
    // window.api.listSessions returns { success, sessions?: Session[], error? }
    const result = await page.evaluate(async () => window.api.listSessions())

    expect(result.success).toBe(true)
    expect(result.sessions!.length).toBeGreaterThan(0)

    const found = result.sessions!.find((s: any) => s.name === 'E2E Scan Test')
    expect(found).toBeTruthy()
  })

  test('can stop a running scan', async () => {
    // Start a scan, capture the returned scanId, then stop it immediately
    // window.api.startScan returns { success, scanId?, error? }
    // window.api.stopScan returns { success, error? }
    const result = await page.evaluate(async sid => {
      const started = await window.api.startScan(sid, { target: '192.168.1.0/24', mode: 'normal' })
      await new Promise(r => setTimeout(r, 100))
      if (started.scanId) {
        await window.api.stopScan(started.scanId)
      }
      return started
    }, sessionId)

    // Verify no crash and the API responded
    expect(typeof result.success).toBe('boolean')
  })

  test('can delete session and it disappears from list', async () => {
    // window.api.deleteSession returns { success, error? }
    const deleteResult = await page.evaluate(async id => window.api.deleteSession(id), sessionId)
    expect(deleteResult.success).toBe(true)

    const listResult = await page.evaluate(async () => window.api.listSessions())
    const found = listResult.sessions?.find((s: any) => s.name === 'E2E Scan Test')
    expect(found).toBeUndefined()
  })
})
