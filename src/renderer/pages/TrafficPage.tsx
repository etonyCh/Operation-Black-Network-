import React, { useState, useEffect, useRef } from 'react'
import { Activity, Play, Square, Filter, Lock, ShieldAlert, Cpu } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useAppStore } from '../store/useAppStore'
import { AreaChart, Area, Tooltip, ResponsiveContainer } from 'recharts'
import type { TrafficPacket, Credential, TrafficStats } from '@shared/types/traffic.types'

export function TrafficPage() {
  const { activeSessionId } = useAppStore()
  const [isCapturing, setIsCapturing] = useState(false)
  const [interfaceName, setInterfaceName] = useState('wlan0')
  const [interfaces, setInterfaces] = useState<{name: string}[]>([])
  const [packets, setPackets] = useState<TrafficPacket[]>([])
  const [credentials, setCredentials] = useState<Credential[]>([])
  const [statsHistory, setStatsHistory] = useState<any[]>([])
  const [bpfFilter, setBpfFilter] = useState('')
  const tableRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Fetch available interfaces on load
    if (window.api) {
      window.api.getNetworkInterfaces().then(ifaces => {
        if (ifaces && ifaces.length > 0) {
          setInterfaces(ifaces)
          setInterfaceName(ifaces[0].name)
        }
      })
    }
  }, [])

  const handleStartCapture = async () => {
    if (!activeSessionId) {
      alert("Please select or create a session in History first.")
      return
    }
    setIsCapturing(true)
    setPackets([])
    setCredentials([])
    setStatsHistory([])
    
    if (window.api) {
      const unsubPacket = window.api.on('traffic:packet', (packet: TrafficPacket) => {
        setPackets(prev => {
          const next = [packet, ...prev]
          if (next.length > 200) next.pop() // keep last 200
          return next
        })
      })
      const unsubStats = window.api.on('traffic:stats', (stats: TrafficStats) => {
        setStatsHistory(prev => {
          const next = [...prev, {
            time: new Date(stats.timestamp).toLocaleTimeString(),
            pps: stats.packetsPerSecond,
            bps: stats.bytesPerSecond / 1024 // KBps
          }]
          if (next.length > 20) next.shift() // keep 20 data points
          return next
        })
      })
      const unsubCred = window.api.on('traffic:credential', (cred: Credential) => {
        setCredentials(prev => [cred, ...prev])
      })
      
      const unsubError = window.api.on('traffic:error', (err: any) => {
        console.error(err)
        setIsCapturing(false)
        alert(`Capture Error: ${err.error}`)
        unsubPacket()
        unsubStats()
        unsubCred()
        unsubError()
      })
      
      await window.api.startCapture(activeSessionId, interfaceName, bpfFilter || undefined)
      
      // Store cleanup function in window to call it on stop
      ;(window as any)._cleanupTraffic = () => {
        unsubPacket()
        unsubStats()
        unsubCred()
        unsubError()
      }
    } else {
      setTimeout(() => setIsCapturing(false), 2000)
    }
  }

  const handleStopCapture = async () => {
    setIsCapturing(false)
    if (window.api) {
      await window.api.stopCapture()
      if ((window as any)._cleanupTraffic) {
        (window as any)._cleanupTraffic()
      }
    }
  }

  useEffect(() => {
    return () => {
      handleStopCapture()
    }
  }, [])

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 gap-6 relative">
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
            disabled={isCapturing}
            className="bg-navy-900 border border-border rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-teal disabled:opacity-50"
          >
            {interfaces.length > 0 ? interfaces.map(iface => (
              <option key={iface.name} value={iface.name}>{iface.name}</option>
            )) : (
              <option value="wlan0">wlan0</option>
            )}
          </select>
          {isCapturing ? (
            <div className="flex items-center text-teal text-sm font-medium animate-pulse bg-teal/10 px-3 py-1.5 rounded-full border border-teal/30">
              <div className="w-2 h-2 bg-teal rounded-full mr-2 shadow-[0_0_8px_rgba(45,212,191,0.8)]"></div>
              Sniffing on {interfaceName}...
            </div>
          ) : null}
          {isCapturing ? (
            <Button variant="destructive" onClick={handleStopCapture}>
              <Square className="w-4 h-4 mr-2" /> Stop Capture
            </Button>
          ) : (
            <Button onClick={handleStartCapture}>
              <Play className="w-4 h-4 mr-2" /> Start Capture
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 overflow-hidden">
        {/* Main Feed */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <Card className="h-48 flex-shrink-0 bg-navy-900/50 border-border">
            <CardHeader className="py-3 px-4 border-b border-border">
              <CardTitle className="text-sm font-medium flex items-center">
                <Cpu className="w-4 h-4 mr-2 text-teal" /> Network Throughput (Packets/sec)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-[140px] p-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={statsHistory}>
                  <defs>
                    <linearGradient id="colorPps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }}
                    itemStyle={{ color: '#2dd4bf' }}
                    labelStyle={{ color: '#94a3b8' }}
                  />
                  <Area type="monotone" dataKey="pps" stroke="#2dd4bf" fillOpacity={1} fill="url(#colorPps)" isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          <Card className="flex-1 flex flex-col overflow-hidden bg-navy-900/50 border-border">
            <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b border-border">
              <CardTitle className="text-sm font-medium">Live Packet Feed <Badge variant="secondary" className="ml-2">{packets.length}</Badge></CardTitle>
              <div className="flex items-center space-x-2">
                <Filter className="w-4 h-4 text-navy-300" />
                <input 
                  type="text" 
                  value={bpfFilter}
                  onChange={(e) => setBpfFilter(e.target.value)}
                  disabled={isCapturing}
                  placeholder="BPF filter (e.g. tcp port 80)"
                  className="bg-navy-800 border border-border rounded px-3 py-1 text-xs text-slate-100 focus:outline-none focus:border-teal w-64 disabled:opacity-50"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0 font-mono text-xs custom-scrollbar" ref={tableRef}>
              <table className="w-full text-left border-collapse">
                <thead className="bg-navy-800 sticky top-0 z-10 shadow-md">
                  <tr>
                    <th className="px-4 py-2 font-medium text-navy-200">Time</th>
                    <th className="px-4 py-2 font-medium text-navy-200">Source</th>
                    <th className="px-4 py-2 font-medium text-navy-200">Destination</th>
                    <th className="px-4 py-2 font-medium text-navy-200">Protocol</th>
                    <th className="px-4 py-2 font-medium text-navy-200">Length</th>
                    <th className="px-4 py-2 font-medium text-navy-200">Info</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {packets.length > 0 ? packets.map(p => (
                    <tr key={p.id} className="hover:bg-navy-800/50 transition-colors">
                      <td className="px-4 py-1.5 text-navy-300 whitespace-nowrap">{new Date(p.timestamp).toISOString().split('T')[1].slice(0, -1)}</td>
                      <td className="px-4 py-1.5 text-slate-100">{p.srcIp}{p.srcPort ? `:${p.srcPort}` : ''}</td>
                      <td className="px-4 py-1.5 text-slate-100">{p.dstIp}{p.dstPort ? `:${p.dstPort}` : ''}</td>
                      <td className={`px-4 py-1.5 font-bold ${p.protocol === 'TCP' ? 'text-blue-400' : p.protocol === 'UDP' ? 'text-teal' : p.protocol === 'HTTP' ? 'text-green-400' : 'text-purple-400'}`}>{p.protocol}</td>
                      <td className="px-4 py-1.5 text-navy-300">{p.length}</td>
                      <td className="px-4 py-1.5 text-navy-200 truncate max-w-md" title={p.info}>{p.info}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-navy-300">
                        {isCapturing ? 'Listening for packets...' : 'Start a capture to see packets.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="flex flex-col gap-6">
          <Card className="flex-1 overflow-hidden flex flex-col border-red-500/30 bg-navy-900/50">
            <CardHeader className="py-4 border-b border-red-500/20 bg-red-500/5">
              <CardTitle className="text-sm text-red-400 flex items-center">
                <ShieldAlert className="w-4 h-4 mr-2" /> Extracted Credentials
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 custom-scrollbar">
              {credentials.length > 0 ? credentials.map(cred => (
                <div key={cred.id} className="bg-navy-800 border border-red-500/30 p-3 rounded-lg shadow-lg relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-red-500/10 rounded-bl-full -mr-8 -mt-8"></div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="destructive" className="text-[10px]">{cred.protocol}</Badge>
                    <span className="text-[10px] text-navy-300 font-mono">{new Date(cred.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="space-y-1 mb-2">
                    <div className="text-xs text-navy-300">From: <span className="text-slate-100">{cred.srcIp}</span></div>
                    <div className="text-xs text-navy-300">Target: <span className="text-slate-100">{cred.dstIp}:{cred.port}</span></div>
                  </div>
                  <div className="bg-navy-900 p-2 rounded border border-navy-700 font-mono text-xs space-y-1">
                    {cred.username && <div className="text-teal">User: <span className="text-slate-100">{cred.username}</span></div>}
                    {cred.password && <div className="text-red-400">Pass: <span className="text-slate-100">{cred.password}</span></div>}
                  </div>
                </div>
              )) : (
                <div className="flex flex-col items-center justify-center h-full text-navy-300 opacity-50">
                  <Lock className="w-10 h-10 mb-2" />
                  <p className="text-sm text-center">No cleartext credentials intercepted yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
