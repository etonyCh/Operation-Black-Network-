import React, { useState } from 'react'
import { Fingerprint, AlertTriangle, ShieldCheck, Search, Activity } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useAppStore } from '../store/useAppStore'

export function FingerprintPage() {
  const { activeSessionId } = useAppStore()
  const [activeTab, setActiveTab] = useState<'overview' | 'ports' | 'os' | 'vulns'>('overview')

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left side: Device List (Mocked) */}
      <div className="w-1/3 border-r border-border flex flex-col bg-panel-dark/30">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-slate-100">Discovered Devices</h2>
          <div className="relative mt-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <input 
              type="text" 
              className="w-full bg-navy-900 border border-border rounded-md pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:border-teal text-slate-100"
              placeholder="Filter by IP or OS..."
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {/* Real data will be populated via IPC */}
          <div className="flex flex-col items-center justify-center py-10 text-navy-300">
            <p className="text-sm">No devices available.</p>
          </div>
        </div>
      </div>

      {/* Right side: Device Detail Drawer */}
      <div className="flex-1 flex flex-col overflow-hidden items-center justify-center bg-panel-dark/50">
        <div className="text-center text-navy-300">
          <Fingerprint className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <h2 className="text-xl font-semibold text-slate-100">No Device Selected</h2>
          <p className="mt-2">Select a device from the list to view fingerprinting details.</p>
        </div>
      </div>
    </div>
  )
}

// Quick icons
const Monitor = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg>
const Network = ({ className }: { className?: string }) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect x="16" y="16" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="9" y="2" width="6" height="6" rx="1"/><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3"/><path d="M12 12V8"/></svg>
