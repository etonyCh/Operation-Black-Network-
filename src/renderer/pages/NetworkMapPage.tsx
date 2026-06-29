import React, { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Play, Square, Filter, Monitor, Smartphone, Server, HelpCircle, Network, LayoutGrid, Share2, Printer, Camera, Cpu, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { NetworkTopology } from '../components/visualizations/NetworkTopology'
import type { Device } from '@shared/types/device.types'

const getDeviceIcon = (device: Device) => {
  const type = device.deviceType?.toLowerCase()
  const os = (device.os?.name || device.os?.family || '').toLowerCase()
  const vendor = (device.vendor || '').toLowerCase()

  if (type === 'mobile' || os.includes('android') || os.includes('ios') || vendor.includes('apple') || vendor.includes('samsung') || vendor.includes('oneplus') || vendor.includes('huawei')) return <Smartphone className="w-8 h-8 text-teal" />
  if (type === 'router' || os.includes('router') || vendor.includes('cisco')) return <Network className="w-8 h-8 text-teal" />
  if (type === 'server' || os.includes('server')) return <Server className="w-8 h-8 text-teal" />
  if (type === 'printer' || vendor.includes('hp') || vendor.includes('epson')) return <Printer className="w-8 h-8 text-teal" />
  if (type === 'camera') return <Camera className="w-8 h-8 text-teal" />
  if (type === 'iot') return <Cpu className="w-8 h-8 text-teal" />
  if (type === 'workstation' || os.includes('windows') || os.includes('mac') || os.includes('linux')) return <Monitor className="w-8 h-8 text-teal" />
  
  return <HelpCircle className="w-8 h-8 text-navy-300" />
}

export function NetworkMapPage() {
  const { activeSessionId } = useAppStore()
  const [devices, setDevices] = useState<Device[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'topology'>('grid')
  const [scanTarget, setScanTarget] = useState('192.168.1.0/24')
  const [scanMode, setScanMode] = useState<'quick' | 'normal' | 'aggressive' | 'ai-deep'>('quick')
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null)
  const [scanStatusMsg, setScanStatusMsg] = useState('Scanning network...')
  
  const handleStartScan = async () => {
    if (!activeSessionId) {
      alert("Please select or create a session in History first.")
      return
    }
    setIsScanning(true)
    setDevices([])
    setSelectedDevice(null)
    setScanStatusMsg(`Scanning network (${scanMode} mode)...`)
    
    if (window.api) {
      const unsubFound = window.api.on('scan:device-found', (device: Device) => {
        setDevices(prev => {
          const filtered = prev.filter(d => d.ip !== device.ip)
          return [...filtered, device]
        })
      })
      const unsubProgress = window.api.on('scan:progress', (progress: any) => {
        if (progress.message) {
          setScanStatusMsg(progress.message)
        }
      })
      const unsubComplete = window.api.on('scan:complete', () => {
        setIsScanning(false)
        unsubFound()
        unsubProgress()
        unsubComplete()
      })
      
      await window.api.startScan(activeSessionId, { target: scanTarget, mode: scanMode as any })
    } else {
      setTimeout(() => setIsScanning(false), 2000)
    }
  }

  const handleStopScan = async () => {
    setIsScanning(false)
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 gap-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center">
            <Network className="w-8 h-8 mr-3 text-teal" />
            Network Map
          </h1>
          <p className="text-navy-200 mt-1">Discover and map devices on your network</p>
        </div>
        <div className="flex items-center space-x-4 glass-panel px-4 py-2 rounded-lg">
          <input 
            type="text" 
            value={scanTarget}
            onChange={(e) => setScanTarget(e.target.value)}
            className="bg-navy-900 border border-border rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-teal w-40"
            placeholder="e.g. 192.168.1.0/24"
          />
          <select 
            value={scanMode}
            onChange={(e) => setScanMode(e.target.value as any)}
            className="bg-navy-900 border border-border rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-teal"
          >
            <option value="quick">Quick Discovery</option>
            <option value="normal">Normal Scan</option>
            <option value="aggressive">Aggressive (OS+Ports)</option>
            <option value="ai-deep">Deep Discovery (Orchestrated)</option>
          </select>
          {isScanning ? (
            <Button variant="destructive" onClick={handleStopScan}>
              <Square className="w-4 h-4 mr-2" /> Stop
            </Button>
          ) : (
            <Button onClick={handleStartScan}>
              <Play className="w-4 h-4 mr-2" /> Scan
            </Button>
          )}
          <div className="h-8 w-px bg-border mx-2"></div>
          <div className="flex bg-navy-900 rounded-lg p-1 border border-border">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-navy-700 text-teal' : 'text-navy-300 hover:text-slate-100'}`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('topology')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'topology' ? 'bg-navy-700 text-teal' : 'text-navy-300 hover:text-slate-100'}`}
              title="Topology View"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
          <div className="h-8 w-px bg-border mx-2"></div>
          <Button variant="outline" size="icon" title="Filter">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between bg-navy-800/50 rounded-lg px-4 py-2 border border-border">
        <span className="text-sm font-medium text-navy-200">
          Discovered Devices: <Badge variant="success" className="ml-2">{devices.length}</Badge>
        </span>
        {isScanning && (
          <div className="flex items-center text-teal text-sm font-medium animate-pulse bg-teal/10 px-3 py-1 rounded-full border border-teal/30">
            <div className="w-2 h-2 bg-teal rounded-full mr-2 shadow-[0_0_8px_rgba(45,212,191,0.8)]"></div>
            {scanStatusMsg}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex gap-6">
        {/* Main Content Area */}
        <div className={`flex-1 overflow-y-auto transition-all duration-300 ease-in-out`}>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-1">
              <AnimatePresence>
                {devices.map((device) => (
                  <motion.div
                    key={device.id || device.ip}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => setSelectedDevice(device)}
                  >
                    <Card className={`hover:border-teal/50 transition-colors cursor-pointer relative overflow-hidden group ${selectedDevice?.ip === device.ip ? 'border-teal ring-1 ring-teal' : ''}`}>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-teal/5 rounded-bl-full -mr-12 -mt-12 group-hover:bg-teal/10 transition-colors"></div>
                      <CardHeader className="pb-2 flex flex-row items-start justify-between">
                        <div className="bg-navy-800 p-3 rounded-lg border border-border">
                          {getDeviceIcon(device)}
                        </div>
                        <Badge variant={device.status === 'online' ? 'success' : 'secondary'}>
                          {device.status.toUpperCase()}
                        </Badge>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-1">
                          <div className="text-lg font-bold text-slate-100 truncate">
                            {device.ip}
                          </div>
                          <div className="text-sm text-teal truncate font-mono">
                            {device.mac || 'Unknown MAC'}
                          </div>
                          <div className="text-sm text-navy-200 truncate mt-2" title={device.os?.name || device.vendor || 'Unknown OS / Vendor'}>
                            {device.os?.name || device.vendor || 'Unknown OS / Vendor'}
                          </div>
                          <div className="text-xs text-navy-300 truncate mt-1">
                            {device.hostname || 'No Hostname'}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
              {!isScanning && devices.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-20 text-navy-300">
                  <Network className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg">No devices discovered yet.</p>
                  <p className="text-sm mt-1">Start a scan to map your network.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full bg-navy-900/50 rounded-xl border border-border overflow-hidden">
              <NetworkTopology devices={devices as any} />
            </div>
          )}
        </div>

        {/* Side Panel for Details */}
        <AnimatePresence>
          {selectedDevice && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 380, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="h-full border border-border bg-navy-800/80 backdrop-blur-md rounded-xl overflow-hidden flex-shrink-0 shadow-2xl"
            >
              <div className="w-[380px] h-full p-6 overflow-y-auto flex flex-col custom-scrollbar">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-bold text-slate-100 flex items-center">
                    <div className="bg-navy-900 p-2 rounded-lg border border-border mr-3">
                      {getDeviceIcon(selectedDevice)}
                    </div>
                    {selectedDevice.ip}
                  </h2>
                  <Button variant="ghost" size="icon" onClick={() => setSelectedDevice(null)} className="hover:bg-navy-700 hover:text-white">
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Device Info */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-teal uppercase tracking-wider">Device Information</h3>
                    <div className="bg-navy-900/80 rounded-lg p-4 space-y-3 border border-border">
                      <div className="flex justify-between items-center">
                        <span className="text-navy-300 text-sm">MAC Address</span>
                        <span className="text-slate-100 font-mono text-sm bg-navy-800 px-2 py-1 rounded">{selectedDevice.mac || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-navy-300 text-sm">Vendor</span>
                        <span className="text-slate-100 text-sm">{selectedDevice.vendor || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-navy-300 text-sm">Hostname</span>
                        <span className="text-slate-100 text-sm">{selectedDevice.hostname || 'None'}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-navy-300 text-sm">Type</span>
                        <span className="text-slate-100 text-sm capitalize">{selectedDevice.deviceType || 'Unknown'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Operating System */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-teal uppercase tracking-wider">Operating System</h3>
                    <div className="bg-navy-900/80 rounded-lg p-4 space-y-3 border border-border">
                      {selectedDevice.os ? (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-navy-300 text-sm">Name</span>
                            <span className="text-slate-100 text-sm font-medium truncate max-w-[150px]" title={selectedDevice.os.name}>{selectedDevice.os.name || 'Unknown'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-navy-300 text-sm">Family</span>
                            <span className="text-slate-100 text-sm">{selectedDevice.os.family || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-navy-300 text-sm">Confidence</span>
                            <span className="text-teal font-mono text-sm">{selectedDevice.os.accuracy}%</span>
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-2">
                          <span className="text-navy-300 text-sm italic">No OS information available.<br/>Run an "Aggressive" scan.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Open Ports */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-teal uppercase tracking-wider">Open Ports <Badge variant="secondary" className="ml-2 text-xs">{selectedDevice.ports?.length || 0}</Badge></h3>
                    <div className="bg-navy-900/80 rounded-lg border border-border overflow-hidden">
                      {selectedDevice.ports && selectedDevice.ports.length > 0 ? (
                        <div className="max-h-64 overflow-y-auto custom-scrollbar">
                          <table className="w-full text-sm">
                            <thead className="bg-navy-800 sticky top-0">
                              <tr>
                                <th className="px-3 py-2 text-left text-navy-200 font-medium">Port</th>
                                <th className="px-3 py-2 text-left text-navy-200 font-medium">Service</th>
                                <th className="px-3 py-2 text-left text-navy-200 font-medium">Version</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {selectedDevice.ports.map((p, i) => (
                                <tr key={i} className="hover:bg-navy-800/50 transition-colors">
                                  <td className="px-3 py-2 text-teal font-mono text-xs">{p.port}/{p.protocol}</td>
                                  <td className="px-3 py-2 text-slate-100 text-xs truncate max-w-[100px]" title={p.service}>{p.service || '-'}</td>
                                  <td className="px-3 py-2 text-navy-300 text-xs truncate max-w-[100px]" title={p.version}>{p.version || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-4 text-center text-sm text-navy-300 italic">No open ports discovered.</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
