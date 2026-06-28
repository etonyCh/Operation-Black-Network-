import React, { useState } from 'react'
import { ShieldAlert, ArrowRightLeft, Database, Search } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useAppStore } from '../store/useAppStore'

export function ProxyPage() {
  const { activeSessionId } = useAppStore()
  const [isProxyRunning, setIsProxyRunning] = useState(false)

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center">
            <ShieldAlert className="w-8 h-8 mr-3 text-teal" />
            Proxy Interceptor
          </h1>
          <p className="text-navy-200 mt-1">Intercept, modify, and replay HTTP/HTTPS requests</p>
        </div>
        <div className="flex items-center space-x-4 glass-panel px-4 py-2 rounded-lg">
          <div className="flex items-center text-sm text-navy-200 mr-2">
            Target: <span className="text-slate-100 font-mono ml-2">{activeSessionId ? 'Session Active' : 'No target selected'}</span>
          </div>
          {isProxyRunning ? (
            <Button variant="destructive" onClick={() => setIsProxyRunning(false)}>
              Stop Proxy
            </Button>
          ) : (
            <Button onClick={() => setIsProxyRunning(true)}>
              Start ARP Spoof & Proxy
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden gap-6">
        {/* Request List */}
        <Card className="w-1/3 flex flex-col overflow-hidden">
          <CardHeader className="py-3 border-b border-border bg-navy-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2 top-1/2 -translate-y-1/2 text-navy-300" />
              <input 
                type="text" 
                placeholder="Search requests..."
                className="w-full bg-navy-900 border border-border rounded pl-8 pr-2 py-1 text-xs text-slate-100 focus:outline-none focus:border-teal"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            <div className="flex flex-col items-center justify-center py-10 text-navy-300">
              <p className="text-sm">No intercepted requests.</p>
            </div>
          </CardContent>
        </Card>

        {/* Request/Response Inspector */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <div className="flex border-b border-border bg-navy-800">
            <button className="px-4 py-2 text-sm font-medium border-b-2 border-teal text-teal">Request</button>
            <button className="px-4 py-2 text-sm font-medium border-b-2 border-transparent text-navy-300 hover:text-slate-100">Response</button>
          </div>
          <CardContent className="flex-1 overflow-y-auto p-4 font-mono text-sm">
            <div className="mb-4 flex space-x-2">
              <Button size="sm" variant="outline">Forward</Button>
              <Button size="sm" variant="outline" className="text-accent border-accent/50 hover:bg-accent/10">Drop</Button>
              <Button size="sm">Replay</Button>
              <Button size="sm" variant="secondary" className="ml-auto"><Database className="w-4 h-4 mr-2"/> Send to AI</Button>
            </div>
            
            <div className="space-y-4">
              <div>
                <div className="text-navy-300 text-xs mb-1">Request Line</div>
                <input className="w-full bg-navy-900 border border-border rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-teal" placeholder="e.g. GET / HTTP/1.1" />
              </div>
              <div>
                <div className="text-navy-300 text-xs mb-1">Headers</div>
                <textarea 
                  className="w-full h-32 bg-navy-900 border border-border rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-teal resize-none"
                  placeholder="Request headers..."
                />
              </div>
              <div>
                <div className="text-navy-300 text-xs mb-1">Body</div>
                <textarea 
                  className="w-full h-48 bg-navy-900 border border-border rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-teal resize-none"
                  placeholder="No body data"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
