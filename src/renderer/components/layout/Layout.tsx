import React from 'react'
import { Sidebar } from './Sidebar'
import { AIPanel } from '../ai-assistant/AIPanel'
import { useAppStore } from '../../store/useAppStore'
import { BotMessageSquare } from 'lucide-react'
import { Button } from '../ui/Button'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const { toggleAIPanel } = useAppStore()

  return (
    <div className="flex h-screen w-screen bg-navy bg-grid-pattern bg-[length:32px_32px] overflow-hidden">
      <Sidebar />
      <main className="flex-1 relative flex flex-col min-w-0 overflow-hidden">
        {children}
        
        {/* Floating AI Button */}
        <div className="absolute bottom-6 right-6 z-40">
          <Button 
            size="icon" 
            variant="default" 
            className="w-12 h-12 rounded-full shadow-glow-teal"
            onClick={toggleAIPanel}
          >
            <BotMessageSquare className="w-6 h-6" />
          </Button>
        </div>
      </main>
      <AIPanel />
    </div>
  )
}
