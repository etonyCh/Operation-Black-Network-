import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { Device } from '@shared/types/device.types'
import type { Vulnerability } from '@shared/types/vulnerability.types'

// ---------------------------------------------------------------------------
// Mock @google/generative-ai — declared in outer scope so we can reset them
// ---------------------------------------------------------------------------

const mockGenerateContent = vi.fn()
const mockSendMessage = vi.fn()
const mockStartChat = vi.fn()
const mockGetGenerativeModel = vi.fn()

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
  HarmCategory: {
    HARM_CATEGORY_HARASSMENT: 'HARM_CATEGORY_HARASSMENT',
    HARM_CATEGORY_HATE_SPEECH: 'HARM_CATEGORY_HATE_SPEECH',
    HARM_CATEGORY_SEXUALLY_EXPLICIT: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
    HARM_CATEGORY_DANGEROUS_CONTENT: 'HARM_CATEGORY_DANGEROUS_CONTENT',
  },
  HarmBlockThreshold: { BLOCK_NONE: 'BLOCK_NONE' },
}))

// ---------------------------------------------------------------------------
// Mock keyring so initialize() and setApiKey() don't hit the OS keychain
// ---------------------------------------------------------------------------

const mockGetSecret = vi.fn().mockResolvedValue(null)
const mockSetSecret = vi.fn().mockResolvedValue(undefined)

vi.mock('@main/utils/keyring', () => ({
  getSecret: mockGetSecret,
  setSecret: mockSetSecret,
}))

// ---------------------------------------------------------------------------
// aiService — dynamically imported per-test so each test gets a fresh
// singleton instance (genAI = null, apiKey = null).
// ---------------------------------------------------------------------------

let aiService: any

beforeEach(async () => {
  // Reset all Gemini SDK mock functions
  mockGenerateContent.mockReset()
  mockSendMessage.mockReset()
  mockStartChat.mockReset()
  mockGetGenerativeModel.mockReset()
  mockGetSecret.mockReset().mockResolvedValue(null)
  mockSetSecret.mockReset().mockResolvedValue(undefined)

  // Re-establish default return values (reset clears implementations)
  mockStartChat.mockReturnValue({ sendMessage: mockSendMessage })
  mockGetGenerativeModel.mockReturnValue({
    generateContent: mockGenerateContent,
    startChat: mockStartChat,
  })

  // Fresh module = fresh AIService instance with genAI/apiKey = null
  vi.resetModules()
  const mod = await import('@main/services/ai.service')
  aiService = mod.aiService
})

// ---------------------------------------------------------------------------
// Helper: mock response object returned by generateContent / sendMessage
// ---------------------------------------------------------------------------

function makeModelResponse(text: string, tokenCount = 0) {
  return {
    response: {
      text: () => text,
      usageMetadata: { totalTokenCount: tokenCount },
    },
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AIService', () => {
  describe('isConfigured()', () => {
    it('returns false when no API key has been set', () => {
      expect(aiService.isConfigured()).toBe(false)
    })

    it('returns true after setApiKey() is called', async () => {
      await aiService.setApiKey('test-api-key-123')
      expect(aiService.isConfigured()).toBe(true)
    })
  })

  // -------------------------------------------------------------------------
  // analyze() — unconfigured state
  // -------------------------------------------------------------------------

  describe('analyze() when not configured', () => {
    it('returns an object with empty text and an error string', async () => {
      const result = await aiService.analyze({ mode: 'explain', context: 'test' })
      expect(result.text).toBe('')
      expect(result.error).toBeDefined()
      expect(typeof result.error).toBe('string')
      expect(result.error!.length).toBeGreaterThan(0)
    })

    it('does NOT call generateContent', async () => {
      await aiService.analyze({ mode: 'explain', context: 'test' })
      expect(mockGenerateContent).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // chat() — unconfigured state
  // -------------------------------------------------------------------------

  describe('chat() when not configured', () => {
    it('returns an object with empty text and an error string', async () => {
      const result = await aiService.chat([], 'Hello', 'explain')
      expect(result.text).toBe('')
      expect(result.error).toBeDefined()
      expect(typeof result.error).toBe('string')
    })

    it('does NOT call startChat', async () => {
      await aiService.chat([], 'Hello', 'explain')
      expect(mockStartChat).not.toHaveBeenCalled()
    })
  })

  // -------------------------------------------------------------------------
  // analyze() — configured state
  // -------------------------------------------------------------------------

  describe('analyze() after setApiKey()', () => {
    beforeEach(async () => {
      await aiService.setApiKey('test-key')
    })

    it('calls model.generateContent()', async () => {
      mockGenerateContent.mockResolvedValueOnce(makeModelResponse('result'))

      await aiService.analyze({ mode: 'explain', context: 'test context' })

      expect(mockGenerateContent).toHaveBeenCalledTimes(1)
    })

    it('returns the text produced by the model', async () => {
      mockGenerateContent.mockResolvedValueOnce(makeModelResponse('AI analysis result', 42))

      const result = await aiService.analyze({ mode: 'explain', context: 'test context' })

      expect(result.text).toBe('AI analysis result')
      expect(result.tokenCount).toBe(42)
      expect(result.error).toBeUndefined()
    })

    it('uses the "explain" system prompt for mode "explain"', async () => {
      mockGenerateContent.mockResolvedValueOnce(makeModelResponse('ok'))

      await aiService.analyze({ mode: 'explain', context: 'ctx' })

      const callArg = mockGenerateContent.mock.calls[0][0]
      const promptText: string = callArg.contents[0].parts[0].text
      // SYSTEM_PROMPTS.explain mentions "cybersecurity assistant"
      expect(promptText).toContain('cybersecurity assistant')
    })

    it('uses the "expert" system prompt for mode "expert"', async () => {
      mockGenerateContent.mockResolvedValueOnce(makeModelResponse('ok'))

      await aiService.analyze({ mode: 'expert', context: 'ctx' })

      const callArg = mockGenerateContent.mock.calls[0][0]
      const promptText: string = callArg.contents[0].parts[0].text
      // SYSTEM_PROMPTS.expert mentions "penetration tester"
      expect(promptText).toContain('penetration tester')
    })

    it('uses the "report" system prompt for mode "report"', async () => {
      mockGenerateContent.mockResolvedValueOnce(makeModelResponse('ok'))

      await aiService.analyze({ mode: 'report', context: 'ctx' })

      const callArg = mockGenerateContent.mock.calls[0][0]
      const promptText: string = callArg.contents[0].parts[0].text
      // SYSTEM_PROMPTS.report mentions "security consultant"
      expect(promptText).toContain('security consultant')
    })

    it('includes context in the prompt', async () => {
      mockGenerateContent.mockResolvedValueOnce(makeModelResponse('ok'))

      await aiService.analyze({ mode: 'explain', context: 'unique-context-value-xyz' })

      const callArg = mockGenerateContent.mock.calls[0][0]
      const promptText: string = callArg.contents[0].parts[0].text
      expect(promptText).toContain('unique-context-value-xyz')
    })

    it('includes the question in the prompt when provided', async () => {
      mockGenerateContent.mockResolvedValueOnce(makeModelResponse('ok'))

      await aiService.analyze({
        mode: 'explain',
        context: 'ctx',
        question: 'What is the risk?',
      })

      const callArg = mockGenerateContent.mock.calls[0][0]
      const promptText: string = callArg.contents[0].parts[0].text
      expect(promptText).toContain('What is the risk?')
    })

    it('returns error text when generateContent throws', async () => {
      mockGenerateContent.mockRejectedValueOnce(new Error('API quota exceeded'))

      const result = await aiService.analyze({ mode: 'explain', context: 'ctx' })

      expect(result.text).toBe('')
      expect(result.error).toBeDefined()
      expect(result.error).toContain('API quota exceeded')
    })
  })

  // -------------------------------------------------------------------------
  // chat() — configured state
  // -------------------------------------------------------------------------

  describe('chat() after setApiKey()', () => {
    beforeEach(async () => {
      await aiService.setApiKey('test-key')
    })

    it('calls model.startChat()', async () => {
      mockSendMessage.mockResolvedValueOnce(makeModelResponse('chat reply'))

      await aiService.chat([], 'Hello', 'explain')

      expect(mockStartChat).toHaveBeenCalledTimes(1)
    })

    it('calls chatSession.sendMessage() with the user message', async () => {
      mockSendMessage.mockResolvedValueOnce(makeModelResponse('pong'))

      await aiService.chat([], 'ping', 'explain')

      expect(mockSendMessage).toHaveBeenCalledWith('ping')
    })

    it('returns the text from sendMessage', async () => {
      mockSendMessage.mockResolvedValueOnce(makeModelResponse('Chat response', 10))

      const result = await aiService.chat([], 'Hello', 'explain')

      expect(result.text).toBe('Chat response')
      expect(result.tokenCount).toBe(10)
    })

    it('passes prior conversation history to startChat', async () => {
      mockSendMessage.mockResolvedValueOnce(makeModelResponse('ok'))

      const history = [
        { role: 'user' as const, content: 'What is nmap?' },
        { role: 'model' as const, content: 'Nmap is a network scanner.' },
      ]

      await aiService.chat(history, 'Tell me more', 'expert')

      const startChatArg = mockStartChat.mock.calls[0][0]
      // history array in startChat should include the mapped prior messages
      const historyArg: Array<{ role: string; parts: { text: string }[] }> = startChatArg.history
      const historyTexts = historyArg.map((h: any) => h.parts[0].text)
      expect(historyTexts).toContain('What is nmap?')
      expect(historyTexts).toContain('Nmap is a network scanner.')
    })

    it('returns error text when sendMessage throws', async () => {
      mockSendMessage.mockRejectedValueOnce(new Error('Rate limited'))

      const result = await aiService.chat([], 'hello', 'explain')

      expect(result.text).toBe('')
      expect(result.error).toContain('Rate limited')
    })
  })

  // -------------------------------------------------------------------------
  // analyzeVulnerabilities()
  // -------------------------------------------------------------------------

  describe('analyzeVulnerabilities()', () => {
    beforeEach(async () => {
      await aiService.setApiKey('test-key')
    })

    it('calls analyze() with mode "report"', async () => {
      mockGenerateContent.mockResolvedValueOnce(makeModelResponse('Security Report', 200))

      const devices: Device[] = [
        {
          id: 'd1',
          sessionId: 's1',
          ip: '192.168.1.1',
          deviceType: 'server',
          status: 'online',
          discoveredAt: 0,
          lastSeen: 0,
        },
      ]
      const vulns: Vulnerability[] = [
        {
          id: 'v1',
          deviceId: 'd1',
          sessionId: 's1',
          title: 'Test Vuln',
          description: 'desc',
          severity: 'high',
          discoveredAt: 0,
        },
      ]

      await aiService.analyzeVulnerabilities(devices, vulns)

      expect(mockGenerateContent).toHaveBeenCalledTimes(1)
      const callArg = mockGenerateContent.mock.calls[0][0]
      const promptText: string = callArg.contents[0].parts[0].text
      // Report mode system prompt contains "security consultant"
      expect(promptText).toContain('security consultant')
    })

    it('returns the AI-generated text', async () => {
      mockGenerateContent.mockResolvedValueOnce(makeModelResponse('Executive Summary...', 150))

      const result = await aiService.analyzeVulnerabilities([], [])

      expect(result.text).toBe('Executive Summary...')
    })

    it('includes device and vulnerability counts in the context', async () => {
      mockGenerateContent.mockResolvedValueOnce(makeModelResponse('ok'))

      const devices: Device[] = [
        {
          id: 'd1',
          sessionId: 's1',
          ip: '10.0.0.1',
          deviceType: 'workstation',
          status: 'online',
          discoveredAt: 0,
          lastSeen: 0,
        },
      ]
      const vulns: Vulnerability[] = [
        {
          id: 'v1',
          deviceId: 'd1',
          sessionId: 's1',
          title: 'Critical Bug',
          description: 'desc',
          severity: 'critical',
          discoveredAt: 0,
        },
        {
          id: 'v2',
          deviceId: 'd1',
          sessionId: 's1',
          title: 'High Bug',
          description: 'desc',
          severity: 'high',
          discoveredAt: 0,
        },
      ]

      await aiService.analyzeVulnerabilities(devices, vulns)

      const callArg = mockGenerateContent.mock.calls[0][0]
      const promptText: string = callArg.contents[0].parts[0].text
      expect(promptText).toContain('1 devices discovered')
      expect(promptText).toContain('2 total vulnerabilities')
      expect(promptText).toContain('Critical: 1')
      expect(promptText).toContain('High: 1')
    })

    it('returns error when service is not configured', async () => {
      // Get a fresh unconfigured instance
      vi.resetModules()
      const mod = await import('@main/services/ai.service')
      const unconfigured = mod.aiService

      const result = await unconfigured.analyzeVulnerabilities([], [])

      expect(result.text).toBe('')
      expect(result.error).toBeDefined()
    })
  })

  // -------------------------------------------------------------------------
  // initialize()
  // -------------------------------------------------------------------------

  describe('initialize()', () => {
    it('does not configure the service when keyring returns null', async () => {
      mockGetSecret.mockResolvedValueOnce(null)

      await aiService.initialize()

      expect(aiService.isConfigured()).toBe(false)
    })

    it('configures the service when keyring returns a stored key', async () => {
      mockGetSecret.mockResolvedValueOnce('stored-key-from-keyring')

      await aiService.initialize()

      expect(aiService.isConfigured()).toBe(true)
    })
  })
})
