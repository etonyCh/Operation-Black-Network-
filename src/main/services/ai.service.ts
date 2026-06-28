import {
  GoogleGenerativeAI,
  GenerativeModel,
  HarmCategory,
  HarmBlockThreshold,
} from '@google/generative-ai'
import { logger } from '@main/utils/logger'
import { getSecret, setSecret } from '@main/utils/keyring'
import type { AIAnalysisRequest, AIAnalysisResponse, AIMessage, AIMode } from '@shared/types/ai.types'
import type { Device } from '@shared/types/device.types'
import type { Vulnerability } from '@shared/types/vulnerability.types'

const MODEL_NAME = 'gemini-1.5-flash'
const KEYRING_ACCOUNT = 'gemini_api_key'

const SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
]

const SYSTEM_PROMPTS: Record<AIMode, string> = {
  explain: `You are a cybersecurity assistant for Black Network, a network penetration testing tool.
Explain findings in plain language that a non-expert can understand.
Be concise, factual, and highlight risks clearly without being alarmist.`,

  expert: `You are a senior penetration tester and security researcher with expertise in network security.
Provide detailed technical analysis, CVSS scores, exploitation techniques, and mitigation strategies.
Use precise security terminology. Reference CVEs, CWEs, and OWASP categories where relevant.`,

  report: `You are a professional security consultant writing an executive-level security report.
Structure your response with clear sections: Executive Summary, Key Findings, Risk Assessment, Recommendations.
Use formal business language. Quantify risk where possible. Prioritize actionable remediation steps.`,
}

class AIService {
  private genAI: GoogleGenerativeAI | null = null
  private model: GenerativeModel | null = null
  private apiKey: string | null = null

  async initialize(): Promise<void> {
    const storedKey = await getSecret(KEYRING_ACCOUNT)
    const envKey = process.env.GEMINI_API_KEY
    if (storedKey) {
      this.setApiKeyInternal(storedKey)
      logger.info('[ai] Gemini API key loaded from keyring')
    } else if (envKey) {
      this.setApiKeyInternal(envKey)
      logger.info('[ai] Gemini API key loaded from .env')
    }
  }

  async setApiKey(key: string): Promise<void> {
    await setSecret(KEYRING_ACCOUNT, key)
    this.setApiKeyInternal(key)
    logger.info('[ai] Gemini API key updated')
  }

  isConfigured(): boolean {
    return this.genAI !== null && this.apiKey !== null
  }

  async analyze(request: AIAnalysisRequest): Promise<AIAnalysisResponse> {
    if (!this.model) {
      return { text: '', error: 'AI not configured — set Gemini API key in Settings' }
    }

    try {
      const systemPrompt = SYSTEM_PROMPTS[request.mode]
      const fullPrompt = request.question
        ? `${systemPrompt}\n\n---\nContext:\n${request.context}\n\n---\nQuestion: ${request.question}`
        : `${systemPrompt}\n\n---\nAnalyze the following network scan data:\n\n${request.context}`

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: fullPrompt }] }],
        safetySettings: SAFETY_SETTINGS,
        generationConfig: { temperature: 0.4, maxOutputTokens: 4096 },
      })

      const text = result.response.text()
      const tokenCount = result.response.usageMetadata?.totalTokenCount
      return { text, tokenCount }
    } catch (err) {
      logger.error(`[ai] analyze error: ${err}`)
      return { text: '', error: String(err) }
    }
  }

  async chat(history: AIMessage[], message: string, mode: AIMode): Promise<AIAnalysisResponse> {
    if (!this.model) {
      return { text: '', error: 'AI not configured — set Gemini API key in Settings' }
    }

    try {
      const systemPrompt = SYSTEM_PROMPTS[mode]
      const mappedHistory = history.map((m) => ({
        role: m.role as 'user' | 'model',
        parts: [{ text: m.content }],
      }))

      const chatSession = this.model.startChat({
        history: [
          { role: 'user', parts: [{ text: `System instructions: ${systemPrompt}` }] },
          { role: 'model', parts: [{ text: 'Understood. I will follow those instructions.' }] },
          ...mappedHistory,
        ],
        safetySettings: SAFETY_SETTINGS,
        generationConfig: { temperature: 0.6, maxOutputTokens: 4096 },
      })

      const result = await chatSession.sendMessage(message)
      const text = result.response.text()
      const tokenCount = result.response.usageMetadata?.totalTokenCount
      return { text, tokenCount }
    } catch (err) {
      logger.error(`[ai] chat error: ${err}`)
      return { text: '', error: String(err) }
    }
  }

  /**
   * Produce a structured vulnerability summary suitable for embedding in a report.
   */
  async analyzeVulnerabilities(devices: Device[], vulns: Vulnerability[]): Promise<AIAnalysisResponse> {
    const criticalCount = vulns.filter((v) => v.severity === 'critical').length
    const highCount = vulns.filter((v) => v.severity === 'high').length
    const mediumCount = vulns.filter((v) => v.severity === 'medium').length

    const context = [
      `Network scan results:`,
      `- ${devices.length} devices discovered`,
      `- ${vulns.length} total vulnerabilities found`,
      `  Critical: ${criticalCount}, High: ${highCount}, Medium: ${mediumCount}`,
      ``,
      `Top vulnerabilities:`,
      ...vulns
        .filter((v) => v.severity === 'critical' || v.severity === 'high')
        .slice(0, 10)
        .map((v) => `- [${v.severity.toUpperCase()}] ${v.title} (${v.cveId ?? 'No CVE'}) on ${v.service ?? 'unknown service'} port ${v.port ?? 'N/A'}`),
    ].join('\n')

    return this.analyze({ mode: 'report', context })
  }

  private setApiKeyInternal(key: string): void {
    this.apiKey = key
    this.genAI = new GoogleGenerativeAI(key)
    this.model = this.genAI.getGenerativeModel({
      model: MODEL_NAME,
      safetySettings: SAFETY_SETTINGS,
    })
  }
}

export const aiService = new AIService()
