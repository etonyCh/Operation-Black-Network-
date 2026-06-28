import React, { useState, useEffect } from 'react'
import { useAppStore } from '../store/useAppStore'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Play, Square, Filter, Monitor, Smartphone, Server, HelpCircle, Network, LayoutGrid, Share2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { NetworkTopology } from '../components/visualizations/NetworkTopology'

// Temporary mock device type since API types aren't fully imported yet
interface Device {
  id: string
  ip: string
  mac?: string
  vendor?: string
  hostname?: string
  status: 'up' | 'down'
  deviceType?: string
  osFamily?: string
}

const getDeviceIcon = (type?: string) => {
  switch (type?.toLowerCase()) {
    case 'router': return <Network className="w-8 h-8 text-navy-300" />
    case 'phone': return <Smartphone className="w-8 h-8 text-navy-300" />
    case 'server': return <Server className="w-8 h-8 text-navy-300" />
    case 'pc': return <Monitor className="w-8 h-8 text-navy-300" />
    default: return <HelpCircle className="w-8 h-8 text-navy-300" />
  }
}

export function NetworkMapPage() {
  const { activeSessionId } = useAppStore()
  const [devices, setDevices] = useState<Device[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'topology'>('grid')
  const [scanTarget, setScanTarget] = useState('192.168.1.0/24')
  
  // Devices are populated via IPC when scanning starts

  const handleStartScan = async () => {
    if (!activeSessionId) {
      alert("Please select or create a session in History first.")
      return
    }
    setIsScanning(true)
    setDevices([])
    
    if (window.api) {
      // Listeners
      const unsubFound = window.api.on('scan:device-found', (device: Device) => {
        setDevices(prev => [...prev.filter(d => d.ip !== device.ip), device])
      })
      const unsubComplete = window.api.on('scan:complete', () => {
        setIsScanning(false)
        unsubFound()
        unsubComplete()
      })
      
      await window.api.startScan(activeSessionId, { target: scanTarget, mode: 'quick' })
    } else {
      setTimeout(() => setIsScanning(false), 2000)
    }
  }

  const handleStopScan = async () => {
    setIsScanning(false)
    // Implementation requires scanId from startScan
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 gap-6">
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
            className="bg-navy-900 border border-border rounded px-3 py-1.5 text-sm text-slate-100 focus:outline-none focus:border-teal"
            placeholder="e.g. 192.168.1.0/24"
          />
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
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setViewMode('topology')}
              className={`p-1.5 rounded-md transition-colors ${viewMode === 'topology' ? 'bg-navy-700 text-teal' : 'text-navy-300 hover:text-slate-100'}`}
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
          <div className="h-8 w-px bg-border mx-2"></div>
          <Button variant="outline" size="icon">
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between bg-navy-800/50 rounded-lg px-4 py-2 border border-border">
        <span className="text-sm font-medium text-navy-200">
          Discovered Devices: <Badge variant="success" className="ml-2">{devices.length}</Badge>
        </span>
        {isScanning && (
          <div className="flex items-center text-teal text-sm font-medium animate-pulse">
            <div className="w-2 h-2 bg-teal rounded-full mr-2"></div>
            Scanning network...
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
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
                >
                  <Card className="hover:border-teal/50 transition-colors cursor-pointer relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-teal/5 rounded-bl-full -mr-12 -mt-12 group-hover:bg-teal/10 transition-colors"></div>
                    <CardHeader className="pb-2 flex flex-row items-start justify-between">
                      <div className="bg-navy-800 p-3 rounded-lg border border-border">
                        {getDeviceIcon(device.deviceType)}
                      </div>
                      <Badge variant={device.status === 'up' ? 'success' : 'secondary'}>
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
                        <div className="text-sm text-navy-200 truncate mt-2">
                          {device.vendor || 'Unknown Vendor'}
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
          <div className="h-full">
            <NetworkTopology devices={devices} />
          </div>
        )}
      </div>
    </div>
  )
}
