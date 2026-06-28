import React, { useState } from 'react'
import { Activity, Play, Square, Filter, Lock, Unlock } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useAppStore } from '../store/useAppStore'

export function TrafficPage() {
  const { activeSessionId } = useAppStore()
  const [isCapturing, setIsCapturing] = useState(false)
  const [interfaceName, setInterfaceName] = useState('wlan0')

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center">
            <Activity className="w-8 h-8 mr-3 text-teal" />
            Traffic Dashboard
          </h1>
          <p className="text-navy-200 mt-1">Real-time packet analysis and credential extraction</p>
        </div>
        <div className="flex items-center space-x-4 glass-panel px-4 py-2 rounded-lg">
          <select 
            value={interfaceName}
            onChange={(e) => setInterfaceName(e.target.value)}
            className="bg-navy-900 border border-border rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-teal"
          >
            <option value="wlan0">wlan0</option>
            <option value="eth0">eth0</option>
            <option value="lo">lo</option>
          </select>
          {isCapturing ? (
            <Button variant="destructive" onClick={() => setIsCapturing(false)}>
              <Square className="w-4 h-4 mr-2" /> Stop Capture
            </Button>
          ) : (
            <Button onClick={() => setIsCapturing(true)}>
              <Play className="w-4 h-4 mr-2" /> Start Capture
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Main Feed */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card className="h-48 flex-shrink-0">
            <CardHeader className="py-4">
              <CardTitle className="text-sm">Throughput by Protocol</CardTitle>
            </CardHeader>
            <CardContent className="h-full flex items-center justify-center text-navy-300">
              [ Recharts AreaChart Placeholder ]
            </CardContent>
          </Card>
          
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader className="py-4 flex flex-row items-center justify-between border-b border-border">
              <CardTitle className="text-sm">Live Packet Feed</CardTitle>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-navy-300" />
                <input 
                  type="text" 
                  placeholder="BPF filter (e.g. tcp port 80)"
                  className="bg-navy-900 border border-border rounded px-2 py-1 text-xs text-slate-100"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0 font-mono text-xs">
              <table className="w-full text-left">
                <thead className="bg-navy-800 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 font-medium text-navy-200">Time</th>
                    <th className="px-4 py-2 font-medium text-navy-200">Source</th>
                    <th className="px-4 py-2 font-medium text-navy-200">Destination</th>
                    <th className="px-4 py-2 font-medium text-navy-200">Protocol</th>
                    <th className="px-4 py-2 font-medium text-navy-200">Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {/* Real packets will stream here */}
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-navy-300">
                      Waiting for packets...
                    </td>
                  </tr>
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="flex flex-col gap-6">
          <Card className="flex-1 overflow-hidden flex flex-col border-accent/20">
            <CardHeader className="py-4 border-b border-accent/20 bg-accent/5">
              <CardTitle className="text-sm text-accent">Extracted Credentials</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 flex flex-col items-center justify-center text-navy-300">
              <Lock className="w-10 h-10 mb-2 opacity-20" />
              <p className="text-sm text-center">No credentials intercepted yet.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
