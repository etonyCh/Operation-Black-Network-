import React, { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../../store/useAppStore'
import { X, Send, Bot, Terminal, ShieldCheck, ShieldAlert, Activity, RefreshCw } from 'lucide-react'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'

interface AIMessage {
  role: 'user' | 'model'
  content: string
}

interface AgentLog {
  id: string
  timestamp: number
  agentId: string
  action: string
  input: string
  output: string
  pddlValid: number
  pddlRule?: string
}

export function AIPanel() {
  const { isAIPanelOpen, setAIPanelOpen, activeSessionId } = useAppStore()
  const [activeTab, setActiveTab] = useState<'chat' | 'soc'>('chat')
  const [messages, setMessages] = useState<AIMessage[]>([
    { role: 'model', content: "Hello! I'm the Black Network AI. How can I help you analyze your network today? (Vous pouvez me poser des questions en Français ou en Kirundi)." }
  ])
  const [inputText, setInputText] = useState('')
  const [aiMode, setAiMode] = useState<'explain' | 'expert' | 'report'>('explain')
  const [isLoading, setIsLoading] = useState(false)
  const [agentLogs, setAgentLogs] = useState<AgentLog[]>([])
  const [isRefreshingLogs, setIsRefreshingLogs] = useState(false)

  const chatEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Load agent logs on open or tab change
  useEffect(() => {
    if (isAIPanelOpen && activeTab === 'soc') {
      loadAgentLogs()
    }
  }, [isAIPanelOpen, activeTab])

  const loadAgentLogs = async () => {
    if (!window.api) return
    setIsRefreshingLogs(true)
    try {
      const logs = await window.api.getAgentAuditLogs()
      setAgentLogs(logs)
    } catch (err) {
      console.error('Failed to load agent logs', err)
    } finally {
      setIsRefreshingLogs(false)
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inputText.trim() || isLoading) return

    const userMsg = inputText.trim()
    setInputText('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setIsLoading(true)

    try {
      if (window.api) {
        // Send conversation history (except initial greeting) to Gemini API
        const historyForApi = messages.slice(1).map(m => ({
          role: m.role,
          content: m.content
        }))
        
        const res = await window.api.chatWithAI(historyForApi, userMsg, aiMode)
        
        if (res.success && res.response) {
          setMessages(prev => [...prev, { role: 'model', content: res.response.text }])
        } else {
          setMessages(prev => [...prev, { role: 'model', content: `Error: ${res.error || 'Unable to contact Gemini.'}` }])
        }
      } else {
        // Mock fallback if API not available
        setTimeout(() => {
          setMessages(prev => [...prev, { role: 'model', content: "Simulated response: Please verify your Gemini API key in Settings." }])
        }, 1000)
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'model', content: `Error: ${String(err)}` }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div 
      className={cn(
        "fixed right-0 top-0 bottom-0 w-80 sm:w-[420px] glass-panel border-l border-border transform transition-transform duration-300 ease-in-out z-50 flex flex-col shadow-panel-lg bg-navy-950",
        isAIPanelOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        <div className="flex items-center text-teal">
          <Bot className="w-5 h-5 mr-2" />
          <span className="font-semibold text-slate-100">AI Sentinel & SOC Agent</span>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={() => setAIPanelOpen(false)}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border bg-navy-900/50">
        <button 
          onClick={() => setActiveTab('chat')}
          className={cn(
            "flex-1 py-3 text-center text-xs font-medium border-b-2 transition-colors",
            activeTab === 'chat' ? "text-teal border-teal" : "text-navy-300 border-transparent hover:text-slate-200"
          )}
        >
          AI Copilot
        </button>
        <button 
          onClick={() => setActiveTab('soc')}
          className={cn(
            "flex-1 py-3 text-center text-xs font-medium border-b-2 transition-colors flex items-center justify-center gap-1.5",
            activeTab === 'soc' ? "text-teal border-teal" : "text-navy-300 border-transparent hover:text-slate-200"
          )}
        >
          <Activity className="w-3.5 h-3.5" />
          Agentic SOC & PDDL
        </button>
      </div>

      {/* Chat Tab Panel */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* AI Mode Selector */}
          <div className="p-3 border-b border-border/50 bg-navy-900/30 flex items-center justify-between text-xs">
            <span className="text-navy-300">Analysis Mode:</span>
            <div className="flex gap-1">
              {(['explain', 'expert', 'report'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setAiMode(mode)}
                  className={cn(
                    "px-2 py-1 rounded text-[10px] uppercase font-bold transition-colors",
                    aiMode === mode ? "bg-teal/20 text-teal border border-teal/40" : "bg-navy-800 text-navy-300 hover:bg-navy-700"
                  )}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((m, idx) => (
              <div 
                key={idx} 
                className={cn(
                  "flex flex-col max-w-[85%] rounded-lg p-3 text-sm text-slate-200",
                  m.role === 'user' 
                    ? "bg-teal/10 border border-teal/30 ml-auto" 
                    : "bg-navy-800 border border-border"
                )}
              >
                <span className="text-[9px] uppercase font-bold text-navy-400 mb-1">
                  {m.role === 'user' ? 'You' : 'Sentinel AI'}
                </span>
                <p className="whitespace-pre-line leading-relaxed">{m.content}</p>
              </div>
            ))}
            {isLoading && (
              <div className="bg-navy-800 border border-border max-w-[85%] rounded-lg p-3 text-sm text-slate-200 flex items-center space-x-2">
                <div className="w-2 h-2 bg-teal rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-teal rounded-full animate-bounce delay-75"></div>
                <div className="w-2 h-2 bg-teal rounded-full animate-bounce delay-150"></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          
          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="p-4 border-t border-border bg-navy-900/50">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                disabled={isLoading}
                className="flex-1 bg-navy-900 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-teal text-slate-100 placeholder:text-navy-400"
                placeholder="Ask a question in Kirundi or French..."
              />
              <Button type="submit" size="icon" variant="default" disabled={isLoading || !inputText.trim()}>
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* SOC & PDDL Tab Panel */}
      {activeTab === 'soc' && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-3 border-b border-border/50 bg-navy-900/30 flex items-center justify-between text-xs">
            <span className="text-navy-200 flex items-center gap-1.5 font-semibold">
              <Terminal className="w-3.5 h-3.5 text-teal" />
              Triage Automatique L1 Actif
            </span>
            <button 
              onClick={loadAgentLogs}
              disabled={isRefreshingLogs}
              className="text-navy-300 hover:text-teal transition-colors disabled:opacity-50"
            >
              <RefreshCw className={cn("w-3.5 h-3.5", isRefreshingLogs && "animate-spin")} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {agentLogs.length > 0 ? (
              agentLogs.map((log) => (
                <div key={log.id} className="bg-navy-900 border border-border/50 rounded-lg p-3 space-y-2">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-mono text-teal font-bold bg-teal/10 px-1.5 py-0.5 rounded">{log.agentId}</span>
                    <span className="text-navy-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  
                  <div className="text-xs">
                    <span className="text-navy-400 font-bold">Action:</span>{' '}
                    <span className="text-slate-200 font-medium">{log.action}</span>
                  </div>

                  <div className="text-xs bg-navy-950 p-2 rounded font-mono text-navy-300 border border-border/20 truncate">
                    <span className="text-navy-400 text-[9px] uppercase block mb-0.5">Input:</span>
                    {log.input}
                  </div>

                  <div className="text-xs bg-navy-950 p-2 rounded font-mono text-slate-300 border border-border/20">
                    <span className="text-navy-400 text-[9px] uppercase block mb-0.5">Output / Résultat:</span>
                    {log.output}
                  </div>

                  {/* PDDL Safety guardrail status */}
                  <div className="pt-1 flex items-center justify-between border-t border-border/10 text-xs">
                    <span className="text-navy-400">Garde-fou PDDL:</span>
                    {log.pddlValid === 1 ? (
                      <span className="text-teal font-bold flex items-center gap-1 text-[10px]">
                        <ShieldCheck className="w-3 h-3 text-teal" /> VALIDÉ
                      </span>
                    ) : (
                      <span className="text-red-500 font-bold flex items-center gap-1 text-[10px] animate-pulse">
                        <ShieldAlert className="w-3 h-3 text-red-500" /> BLOQUÉ ({log.pddlRule || 'Violation'})
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-navy-300">
                <Terminal className="w-8 h-8 mb-2 opacity-20" />
                <p className="text-sm text-center">Aucun log d'agent disponible.</p>
                <p className="text-[10px] text-navy-400 text-center mt-1">Déclenchez une simulation CTEM dans l'onglet "PQC & CTEM" pour peupler les logs.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
