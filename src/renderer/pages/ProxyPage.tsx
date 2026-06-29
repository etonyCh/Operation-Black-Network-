import React, { useState, useEffect } from 'react'
import { ShieldAlert, ArrowRightLeft, Database, Search, Target, Server, Edit3, Play, Square, Network, Crosshair } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useAppStore } from '../store/useAppStore'
import type { Device } from '@shared/types/device.types'
import type { ProxyRequest, ProxyResponse } from '@shared/types/proxy.types'

type Transaction = {
  req: ProxyRequest
  res?: ProxyResponse
}

export function ProxyPage() {
  const { activeSessionId } = useAppStore()
  const [isProxyRunning, setIsProxyRunning] = useState(false)
  const [devices, setDevices] = useState<Device[]>([])
  const [selectedTargetId, setSelectedTargetId] = useState<string>('')
  
  // MITM Config
  const [gatewayIp, setGatewayIp] = useState('192.168.1.1')
  const [interfaceName, setInterfaceName] = useState('wlan0')
  const [interfaces, setInterfaces] = useState<{name: string, ip: string}[]>([])

  // State
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'request' | 'response'>('request')
  const [searchQuery, setSearchQuery] = useState('')

  // Replay State
  const [isEditing, setIsEditing] = useState(false)
  const [editMethod, setEditMethod] = useState('')
  const [editUrl, setEditUrl] = useState('')
  const [editHeaders, setEditHeaders] = useState('')
  const [editBody, setEditBody] = useState('')

  useEffect(() => {
    // Fetch interfaces
    if (window.api) {
      window.api.getNetworkInterfaces().then(ifaces => {
        if (ifaces && ifaces.length > 0) {
          setInterfaces(ifaces)
          setInterfaceName(ifaces[0].name)
          
          // Try to guess gateway from local IP (naive approach: replacing last octet with .1)
          const localIp = ifaces[0].ip
          if (localIp) {
            const parts = localIp.split('.')
            if (parts.length === 4) {
              setGatewayIp(`${parts[0]}.${parts[1]}.${parts[2]}.1`)
            }
          }
        }
      })

      if (activeSessionId) {
        window.api.getSessionDevices(activeSessionId).then(res => {
          if (res.success && res.devices) {
            setDevices(res.devices)
          }
        })
      }
    }
  }, [activeSessionId])

  const selectedDevice = devices.find(d => d.id === selectedTargetId)
  const selectedTx = transactions.find(t => t.req.id === selectedTxId)

  const handleStartProxy = async () => {
    if (!activeSessionId) {
      alert("Please select a session first.")
      return
    }
    if (!selectedDevice) {
      alert("Please select a target device from the list.")
      return
    }

    setIsProxyRunning(true)
    setTransactions([])
    setSelectedTxId(null)

    if (window.api) {
      const unsubReq = window.api.on('proxy:request', (req: ProxyRequest) => {
        setTransactions(prev => [{ req }, ...prev].slice(0, 500))
      })
      const unsubRes = window.api.on('proxy:response', (res: ProxyResponse) => {
        setTransactions(prev => prev.map(t => t.req.id === res.requestId ? { ...t, res } : t))
      })
      const unsubErr = window.api.on('proxy:error', (err: any) => {
        console.error("Proxy error:", err)
      })

      // Store cleanup function
      ;(window as any)._cleanupProxy = () => {
        unsubReq()
        unsubRes()
        unsubErr()
      }

      await window.api.startProxy(activeSessionId, 8080)
      
      const config = {
        targetIp: selectedDevice.ip,
        gatewayIp: gatewayIp,
        interface: interfaceName
      }
      
      const arpRes = await window.api.startARPSpoof(config)
      if (!arpRes.success) {
        setIsProxyRunning(false)
        alert(`ARP Spoof failed (Ensure you have root/pkexec permissions): ${arpRes.error}`)
        await window.api.stopProxy()
        if ((window as any)._cleanupProxy) (window as any)._cleanupProxy()
      }
    } else {
      setTimeout(() => setIsProxyRunning(false), 2000)
    }
  }

  const handleStopProxy = async () => {
    setIsProxyRunning(false)
    if (window.api) {
      await window.api.stopARPSpoof()
      await window.api.stopProxy()
      if ((window as any)._cleanupProxy) {
        (window as any)._cleanupProxy()
      }
    }
  }

  useEffect(() => {
    return () => {
      handleStopProxy()
    }
  }, [])

  const filteredTransactions = transactions.filter(t => 
    t.req.url.toLowerCase().includes(searchQuery.toLowerCase()) || 
    t.req.method.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const startEditing = () => {
    if (!selectedTx) return
    setIsEditing(true)
    setEditMethod(selectedTx.req.method)
    setEditUrl(selectedTx.req.url)
    
    // Format headers as raw string
    const headerStr = Object.entries(selectedTx.req.headers)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n')
    setEditHeaders(headerStr)
    setEditBody(selectedTx.req.body || '')
    setActiveTab('request')
  }

  const handleReplay = async () => {
    if (!selectedTx || !window.api) return
    
    // Parse raw header string back to object
    const newHeaders: Record<string, string> = {}
    editHeaders.split('\n').forEach(line => {
      const match = line.match(/^([^:]+):\s*(.*)$/)
      if (match) newHeaders[match[1]] = match[2]
    })

    const modifications: Partial<ProxyRequest> = {
      method: editMethod,
      url: editUrl,
      headers: newHeaders,
      body: editBody
    }

    const res = await window.api.replayRequest(selectedTx.req, modifications)
    if (res.success && res.response) {
      // Create a fake transaction pair to show the replayed result at the top
      const fakeReq: ProxyRequest = {
        ...selectedTx.req,
        id: crypto.randomUUID(),
        method: editMethod,
        url: editUrl,
        headers: newHeaders,
        body: editBody,
        timestamp: Date.now()
      }
      setTransactions(prev => [{ req: fakeReq, res: res.response }, ...prev])
      setIsEditing(false)
    } else {
      alert(`Replay failed: ${res.error}`)
    }
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left side: Target Selection */}
      <div className="w-1/4 border-r border-border flex flex-col bg-navy-900/30">
        <div className="p-4 border-b border-border bg-navy-800/80">
          <h1 className="text-xl font-bold text-slate-100 flex items-center mb-1">
            <ArrowRightLeft className="w-5 h-5 mr-2 text-teal" /> MITM Proxy
          </h1>
          <p className="text-xs text-navy-300">Intercept & Modify Traffic</p>
        </div>

        <div className="p-4 border-b border-border space-y-4 bg-navy-900/50">
          <div>
            <label className="text-xs font-medium text-navy-300 mb-1 block">Network Interface</label>
            <select 
              value={interfaceName}
              onChange={(e) => setInterfaceName(e.target.value)}
              disabled={isProxyRunning}
              className="w-full bg-navy-800 border border-border rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-teal disabled:opacity-50"
            >
              {interfaces.length > 0 ? interfaces.map(iface => (
                <option key={iface.name} value={iface.name}>{iface.name} ({iface.ip})</option>
              )) : (
                <option value="wlan0">wlan0</option>
              )}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-navy-300 mb-1 block">Gateway IP (Router)</label>
            <input 
              type="text" 
              value={gatewayIp}
              onChange={(e) => setGatewayIp(e.target.value)}
              disabled={isProxyRunning}
              className="w-full bg-navy-800 border border-border rounded px-3 py-1.5 text-sm font-mono text-slate-100 focus:outline-none focus:border-teal disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          <label className="text-xs font-medium text-navy-300 ml-1 block mb-2">Select Target Victim</label>
          {devices.length > 0 ? devices.map(device => (
            <div 
              key={device.id} 
              onClick={() => !isProxyRunning && setSelectedTargetId(device.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedTargetId === device.id ? 'bg-red-500/10 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-navy-800 border-border hover:border-red-500/50'} ${isProxyRunning ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div className="font-bold text-slate-100 flex items-center">
                  <Target className={`w-3 h-3 mr-2 ${selectedTargetId === device.id ? 'text-red-500' : 'text-navy-400'}`} />
                  {device.ip}
                </div>
              </div>
              <div className="text-xs text-navy-300 mt-1">{device.os?.name || device.vendor || 'Unknown OS'}</div>
            </div>
          )) : (
            <div className="text-center text-navy-400 text-sm mt-4">No devices found. Run a network scan first.</div>
          )}
        </div>

        <div className="p-4 border-t border-border bg-navy-800/80">
          {isProxyRunning ? (
            <Button variant="destructive" className="w-full shadow-[0_0_15px_rgba(239,68,68,0.4)]" onClick={handleStopProxy}>
              <Square className="w-4 h-4 mr-2" /> Stop Attack
            </Button>
          ) : (
            <Button className="w-full bg-red-600 hover:bg-red-700 text-white shadow-[0_0_15px_rgba(220,38,38,0.4)]" onClick={handleStartProxy}>
              <Crosshair className="w-4 h-4 mr-2" /> Inject ARP & Proxy
            </Button>
          )}
        </div>
      </div>

      {/* Middle: Request Feed */}
      <div className="w-1/3 border-r border-border flex flex-col bg-navy-900/10">
        <div className="p-3 border-b border-border bg-navy-800">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search HTTP requests..."
              className="w-full bg-navy-900 border border-border rounded pl-9 pr-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-teal"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-0 custom-scrollbar divide-y divide-border/50">
          {filteredTransactions.length > 0 ? filteredTransactions.map(tx => (
            <div 
              key={tx.req.id} 
              onClick={() => { setSelectedTxId(tx.req.id); setIsEditing(false); }}
              className={`p-3 cursor-pointer hover:bg-navy-800 transition-colors ${selectedTxId === tx.req.id ? 'bg-navy-800 border-l-2 border-teal' : 'border-l-2 border-transparent'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center space-x-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    tx.req.method === 'GET' ? 'bg-blue-500/20 text-blue-400' : 
                    tx.req.method === 'POST' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
                  }`}>{tx.req.method}</span>
                  <span className="text-xs font-mono text-slate-300 truncate max-w-[150px]" title={tx.req.url}>{new URL(tx.req.url).pathname}</span>
                </div>
                {tx.res ? (
                  <span className={`text-[10px] font-mono font-bold ${tx.res.statusCode < 300 ? 'text-green-400' : tx.res.statusCode < 400 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {tx.res.statusCode}
                  </span>
                ) : (
                  <span className="text-[10px] text-navy-400 animate-pulse">Pending...</span>
                )}
              </div>
              <div className="text-[10px] text-navy-400 truncate mt-1">Host: {tx.req.host}</div>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center py-20 text-navy-300 opacity-50">
              <Network className="w-12 h-12 mb-4" />
              <p className="text-sm">No traffic captured yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right: Inspector */}
      <div className="flex-1 flex flex-col bg-navy-900/30 overflow-hidden">
        {!selectedTx ? (
          <div className="flex-1 flex flex-col items-center justify-center text-navy-300 opacity-50">
            <Search className="w-16 h-16 mb-4" />
            <h2 className="text-lg font-semibold text-slate-100">Inspector</h2>
            <p className="text-sm">Select a request to view details</p>
          </div>
        ) : (
          <>
            <div className="flex border-b border-border bg-navy-800">
              <button 
                onClick={() => setActiveTab('request')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'request' ? 'border-teal text-teal' : 'border-transparent text-navy-300 hover:text-slate-100'}`}
              >
                Request
              </button>
              <button 
                onClick={() => setActiveTab('response')}
                className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${activeTab === 'response' ? 'border-teal text-teal' : 'border-transparent text-navy-300 hover:text-slate-100'}`}
              >
                Response {selectedTx.res && <Badge variant="secondary" className="ml-2 text-[10px]">{selectedTx.res.statusCode}</Badge>}
              </button>
              
              <div className="ml-auto flex items-center pr-2">
                {!isEditing && (
                  <Button size="sm" variant="outline" className="h-8 text-xs border-teal/30 text-teal hover:bg-teal/10" onClick={startEditing}>
                    <Edit3 className="w-3 h-3 mr-2" /> Edit & Replay
                  </Button>
                )}
                {isEditing && (
                  <div className="flex space-x-2">
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={handleReplay}>
                      <Play className="w-3 h-3 mr-2" /> Fire Replay
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {activeTab === 'request' && (
                <div className="space-y-4">
                  {/* Request Line */}
                  <div className="bg-navy-800 p-3 rounded-lg border border-border">
                    <div className="text-[10px] font-bold text-navy-400 uppercase tracking-wider mb-2">Request Target</div>
                    {isEditing ? (
                      <div className="flex gap-2">
                        <input 
                          value={editMethod}
                          onChange={e => setEditMethod(e.target.value)}
                          className="w-24 bg-navy-900 border border-border rounded px-2 py-1 text-sm font-mono text-teal focus:outline-none focus:border-teal" 
                        />
                        <input 
                          value={editUrl}
                          onChange={e => setEditUrl(e.target.value)}
                          className="flex-1 bg-navy-900 border border-border rounded px-2 py-1 text-sm font-mono text-slate-100 focus:outline-none focus:border-teal" 
                        />
                      </div>
                    ) : (
                      <div className="font-mono text-sm break-all">
                        <span className="text-teal font-bold mr-2">{selectedTx.req.method}</span>
                        <span className="text-slate-100">{selectedTx.req.url}</span>
                        <span className="text-navy-400 ml-2">{selectedTx.req.httpVersion}</span>
                      </div>
                    )}
                  </div>

                  {/* Headers */}
                  <div className="bg-navy-800 p-3 rounded-lg border border-border">
                    <div className="text-[10px] font-bold text-navy-400 uppercase tracking-wider mb-2">Headers</div>
                    {isEditing ? (
                      <textarea 
                        value={editHeaders}
                        onChange={e => setEditHeaders(e.target.value)}
                        className="w-full h-48 bg-navy-900 border border-border rounded p-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-teal custom-scrollbar whitespace-pre"
                        spellCheck={false}
                      />
                    ) : (
                      <div className="bg-navy-900 rounded border border-navy-700 p-2 overflow-x-auto">
                        <table className="w-full text-left text-xs font-mono">
                          <tbody className="divide-y divide-navy-800/50">
                            {Object.entries(selectedTx.req.headers).map(([k, v]) => (
                              <tr key={k}>
                                <td className="py-1 pr-4 text-teal/80 font-semibold whitespace-nowrap">{k}:</td>
                                <td className="py-1 text-slate-300 break-all">{v}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="bg-navy-800 p-3 rounded-lg border border-border flex flex-col min-h-[200px]">
                    <div className="text-[10px] font-bold text-navy-400 uppercase tracking-wider mb-2">Request Body</div>
                    {isEditing ? (
                      <textarea 
                        value={editBody}
                        onChange={e => setEditBody(e.target.value)}
                        className="flex-1 w-full bg-navy-900 border border-border rounded p-2 text-sm font-mono text-slate-100 focus:outline-none focus:border-teal custom-scrollbar whitespace-pre"
                        spellCheck={false}
                      />
                    ) : (
                      <div className="flex-1 bg-navy-900 rounded border border-navy-700 p-3 overflow-x-auto font-mono text-sm text-slate-300 whitespace-pre-wrap break-all custom-scrollbar">
                        {selectedTx.req.body || <span className="text-navy-500 italic">No body data</span>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'response' && (
                <div className="space-y-4">
                  {!selectedTx.res ? (
                    <div className="p-8 text-center text-navy-400 font-mono text-sm">
                      <Activity className="w-8 h-8 mx-auto mb-4 animate-spin opacity-50" />
                      Waiting for server response...
                    </div>
                  ) : (
                    <>
                      {/* Status Line */}
                      <div className="bg-navy-800 p-3 rounded-lg border border-border flex items-center justify-between">
                        <div className="font-mono text-sm">
                          <span className={`font-bold ${selectedTx.res.statusCode < 300 ? 'text-green-400' : selectedTx.res.statusCode < 400 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {selectedTx.res.statusCode} {selectedTx.res.statusMessage}
                          </span>
                        </div>
                        <div className="flex gap-3 text-xs text-navy-400 font-mono">
                          <span>{selectedTx.res.duration}ms</span>
                          <span>{(selectedTx.res.size / 1024).toFixed(2)} KB</span>
                        </div>
                      </div>

                      {/* Headers */}
                      <div className="bg-navy-800 p-3 rounded-lg border border-border">
                        <div className="text-[10px] font-bold text-navy-400 uppercase tracking-wider mb-2">Headers</div>
                        <div className="bg-navy-900 rounded border border-navy-700 p-2 overflow-x-auto">
                          <table className="w-full text-left text-xs font-mono">
                            <tbody className="divide-y divide-navy-800/50">
                              {Object.entries(selectedTx.res.headers).map(([k, v]) => (
                                <tr key={k}>
                                  <td className="py-1 pr-4 text-teal/80 font-semibold whitespace-nowrap">{k}:</td>
                                  <td className="py-1 text-slate-300 break-all">{v}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Body */}
                      <div className="bg-navy-800 p-3 rounded-lg border border-border flex flex-col min-h-[300px]">
                        <div className="text-[10px] font-bold text-navy-400 uppercase tracking-wider mb-2 flex justify-between">
                          <span>Response Body</span>
                          {selectedTx.res.contentType && <Badge variant="secondary" className="text-[9px]">{selectedTx.res.contentType}</Badge>}
                        </div>
                        <div className="flex-1 bg-navy-900 rounded border border-navy-700 p-3 overflow-auto font-mono text-sm text-slate-300 whitespace-pre-wrap break-all custom-scrollbar">
                          {selectedTx.res.body || <span className="text-navy-500 italic">No body data</span>}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
