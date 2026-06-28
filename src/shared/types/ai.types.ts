export type AIMode = 'explain' | 'expert' | 'report'

export interface AIMessage {
  role: 'user' | 'model'
  content: string
}

export interface AIAnalysisRequest {
  mode: AIMode
  context: string
  question?: string
  history?: AIMessage[]
}

export interface AIAnalysisResponse {
  text: string
  tokenCount?: number
  error?: string
}
