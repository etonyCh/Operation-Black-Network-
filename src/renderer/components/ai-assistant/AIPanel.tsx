import React from 'react'
import { useAppStore } from '../../store/useAppStore'
import { X, Send, Bot } from 'lucide-react'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'

export function AIPanel() {
  const { isAIPanelOpen, setAIPanelOpen } = useAppStore()

  return (
    <div 
      className={cn(
        "fixed right-0 top-0 bottom-0 w-80 sm:w-96 glass-panel border-l border-border transform transition-transform duration-300 ease-in-out z-50 flex flex-col shadow-panel-lg",
        isAIPanelOpen ? "translate-x-0" : "translate-x-full"
      )}
    >
      <div className="h-16 flex items-center justify-between px-4 border-b border-border">
        <div className="flex items-center text-teal">
          <Bot className="w-5 h-5 mr-2" />
          <span className="font-semibold text-slate-100">AI Assistant</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setAIPanelOpen(false)}>
          <X className="w-5 h-5" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-navy-800 rounded-lg p-3 text-sm text-slate-200">
          Hello! I'm the Black Network AI. How can I help you analyze your network today?
        </div>
      </div>
      
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input 
            type="text" 
            className="flex-1 bg-navy-900 border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-teal text-slate-100 placeholder:text-navy-400"
            placeholder="Ask a question..."
          />
          <Button size="icon" variant="default">
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
