export interface ReportSections {
  executiveSummary: boolean
  networkTopology: boolean
  deviceInventory: boolean
  vulnerabilities: boolean
  trafficAnalysis: boolean
  proxyCaptures: boolean
  aiSummary: boolean
}

export interface ReportOptions {
  sessionId: string
  format: 'pdf' | 'docx'
  title?: string
  authorName?: string
  companyName?: string
  includeSections: ReportSections
}

export interface ReportResult {
  success: boolean
  path?: string
  error?: string
  size?: number
}
