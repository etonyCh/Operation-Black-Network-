import { test, expect, _electron as electron, ElectronApplication, Page } from '@playwright/test'
import { resolve } from 'path'

let app: ElectronApplication
let page: Page

test.beforeAll(async () => {
  app = await electron.launch({
    args: [resolve(__dirname, '../../out/main/index.js'), '--no-sandbox', '--disable-gpu'],
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

test.describe('Phase 4 — Proxy & Session Management', () => {
  test.describe('Session CRUD full lifecycle', () => {
    test('create → list → update → get → delete', async () => {
      // ── Create ────────────────────────────────────────────────────────────────
      // window.api.createSession returns { success, session?, error? }
      const createResult = await page.evaluate(async () =>
        window.api.createSession({
          name: 'Lifecycle Test',
          target: '10.0.0.0/8',
          notes: 'E2E test',
        })
      )
      expect(createResult.success).toBe(true)
      expect(createResult.session!.id).toBeTruthy()
      expect(createResult.session!.target).toBe('10.0.0.0/8')
      expect(createResult.session!.notes).toBe('E2E test')

      const id = createResult.session!.id

      // ── List — session should appear ──────────────────────────────────────────
      // window.api.listSessions returns { success, sessions?, error? }
      const listResult = await page.evaluate(async () => window.api.listSessions())
      expect(listResult.success).toBe(true)
      expect(listResult.sessions!.some((s: any) => s.id === id)).toBe(true)

      // ── Update ────────────────────────────────────────────────────────────────
      // window.api.updateSession returns { success, session?, error? }
      const updateResult = await page.evaluate(
        async sid =>
          window.api.updateSession(sid, { name: 'Updated Lifecycle Test', notes: 'Updated' }),
        id
      )
      expect(updateResult.success).toBe(true)
      expect(updateResult.session!.name).toBe('Updated Lifecycle Test')
      expect(updateResult.session!.notes).toBe('Updated')

      // ── Get detail ────────────────────────────────────────────────────────────
      // window.api.getSession returns { success, session?: Session & { deviceCount, vulnCount, riskScore }, error? }
      const getResult = await page.evaluate(async sid => window.api.getSession(sid), id)
      expect(getResult.success).toBe(true)
      expect(getResult.session!.name).toBe('Updated Lifecycle Test')
      expect(typeof getResult.session!.deviceCount).toBe('number')
      expect(typeof getResult.session!.vulnCount).toBe('number')
      expect(typeof getResult.session!.riskScore).toBe('number')

      // ── Delete ────────────────────────────────────────────────────────────────
      // window.api.deleteSession returns { success, error? }
      const deleteResult = await page.evaluate(async sid => window.api.deleteSession(sid), id)
      expect(deleteResult.success).toBe(true)

      // ── List — session should be gone ─────────────────────────────────────────
      const listResult2 = await page.evaluate(async () => window.api.listSessions())
      expect(listResult2.sessions!.some((s: any) => s.id === id)).toBe(false)
    })

    test('getSession returns error for non-existent id', async () => {
      const result = await page.evaluate(async () =>
        window.api.getSession('00000000-0000-0000-0000-000000000000')
      )
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    test('updatedAt changes after updateSession', async () => {
      const createResult = await page.evaluate(async () =>
        window.api.createSession({ name: 'Timestamp Test' })
      )
      const original = createResult.session!

      // Small delay to ensure a different timestamp
      await new Promise(r => setTimeout(r, 10))

      const updateResult = await page.evaluate(
        async sid => window.api.updateSession(sid, { name: 'Timestamp Test Updated' }),
        original.id
      )

      expect(updateResult.session!.updatedAt).toBeGreaterThanOrEqual(original.updatedAt)

      // Cleanup
      await page.evaluate(async sid => window.api.deleteSession(sid), original.id)
    })
  })

  test.describe('Settings', () => {
    test('getSetting returns null for unknown key', async () => {
      // window.api.getSetting returns { success, value?: string | null, error? }
      const result = await page.evaluate(async () => window.api.getSetting('nonexistent_key_xyz'))
      expect(result.success).toBe(true)
      expect(result.value).toBeNull()
    })

    test('setSetting + getSetting round-trip', async () => {
      // window.api.setSetting returns { success, error? }
      await page.evaluate(async () => window.api.setSetting('test_key', 'test_value'))

      const result = await page.evaluate(async () => window.api.getSetting('test_key'))
      expect(result.success).toBe(true)
      expect(result.value).toBe('test_value')
    })

    test('overwriting a setting replaces the value', async () => {
      await page.evaluate(async () => window.api.setSetting('overwrite_key', 'first'))
      await page.evaluate(async () => window.api.setSetting('overwrite_key', 'second'))

      const result = await page.evaluate(async () => window.api.getSetting('overwrite_key'))
      expect(result.success).toBe(true)
      expect(result.value).toBe('second')
    })

    test('multiple distinct keys are stored independently', async () => {
      await page.evaluate(async () => window.api.setSetting('key_alpha', 'alpha'))
      await page.evaluate(async () => window.api.setSetting('key_beta', 'beta'))

      const alpha = await page.evaluate(async () => window.api.getSetting('key_alpha'))
      const beta = await page.evaluate(async () => window.api.getSetting('key_beta'))

      expect(alpha.value).toBe('alpha')
      expect(beta.value).toBe('beta')
    })
  })

  test.describe('AI Configuration', () => {
    test('checkAIConfig returns false when no API key is configured', async () => {
      // checkAIConfig is a direct boolean — no wrapper
      const configured = await page.evaluate(async () => window.api.checkAIConfig())
      expect(configured).toBe(false)
    })

    test('analyzeWithAI returns an error response when not configured', async () => {
      // window.api.analyzeWithAI returns { success, response?, error? }
      // When AI is not configured the handler catches the error and returns { success: false, error }
      const result = await page.evaluate(async () =>
        window.api.analyzeWithAI({
          mode: 'explain',
          context: 'Test context',
          question: 'What is this?',
        })
      )
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    test('chatWithAI returns an error response when not configured', async () => {
      // window.api.chatWithAI returns { success, response?, error? }
      const result = await page.evaluate(async () => window.api.chatWithAI([], 'Hello', 'explain'))
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })
  })

  test.describe('Proxy', () => {
    test('startProxy returns a well-shaped response', async () => {
      // mitmproxy may not be installed in CI — just verify the response shape
      // window.api.startProxy returns { success, proxyPort?, error? }
      const createResult = await page.evaluate(async () =>
        window.api.createSession({ name: 'Proxy Test Session' })
      )
      const sid = createResult.session!.id

      const result = await page.evaluate(
        async sessionId => window.api.startProxy(sessionId, 8181),
        sid
      )

      expect(result).toBeDefined()
      expect(typeof result.success).toBe('boolean')

      if (result.success) {
        expect(result.proxyPort).toBe(8181)
        await page.evaluate(async () => window.api.stopProxy())
      } else {
        // mitmproxy not available — error should be descriptive
        expect(result.error).toBeTruthy()
      }

      // Cleanup session
      await page.evaluate(async id => window.api.deleteSession(id), sid)
    })

    test('stopProxy is safe to call when proxy is not running', async () => {
      // window.api.stopProxy returns { success, error? }
      const result = await page.evaluate(async () => window.api.stopProxy())
      expect(result).toBeDefined()
      expect(typeof result.success).toBe('boolean')
    })
  })

  test.describe('Export', () => {
    test('exportSession returns a .netsent file path', async () => {
      const createResult = await page.evaluate(async () =>
        window.api.createSession({ name: 'Export Test' })
      )
      const sid = createResult.session!.id

      // window.api.exportSession returns { success, path?, error? }
      const exportResult = await page.evaluate(async id => window.api.exportSession(id), sid)

      expect(exportResult.success).toBe(true)
      expect(typeof exportResult.path).toBe('string')
      expect(exportResult.path).toContain('.netsent')

      // Cleanup
      await page.evaluate(async id => window.api.deleteSession(id), sid)
    })

    test('exportSession fails gracefully for non-existent session', async () => {
      const result = await page.evaluate(async () =>
        window.api.exportSession('00000000-0000-0000-0000-000000000000')
      )
      expect(result.success).toBe(false)
      expect(result.error).toBeTruthy()
    })

    test('exported file path contains the session name', async () => {
      const createResult = await page.evaluate(async () =>
        window.api.createSession({ name: 'Named Export Session' })
      )
      const sid = createResult.session!.id

      const exportResult = await page.evaluate(async id => window.api.exportSession(id), sid)
      expect(exportResult.success).toBe(true)
      // Session name is sanitised and embedded in the filename
      expect(exportResult.path).toContain('Named_Export_Session')

      // Cleanup
      await page.evaluate(async id => window.api.deleteSession(id), sid)
    })
  })
})
