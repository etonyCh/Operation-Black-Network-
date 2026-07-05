import React, { useState, useEffect } from 'react'
import { Fingerprint, ShieldCheck, Search, Activity, Cpu, Monitor as MonitorIcon, Server, Cpu as PqcIcon, ShieldCheck as CtemIcon, Info } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useAppStore } from '../store/useAppStore'
import type { Device } from '@shared/types/device.types'
import type { Vulnerability } from '@shared/types/vulnerability.types'

type DeviceWithVulns = Device & { vulnerabilities?: Vulnerability[] }

interface PqcTabProps {
  device: DeviceWithVulns
}

function PqcTab({ device }: PqcTabProps) {
  const [pqcResults, setPqcResults] = useState<Record<number, {
    isQuantumReady: boolean
    riskLevel: 'high' | 'medium' | 'low' | 'none'
    algorithmsFound: string[]
    recommendations: string[]
  }>>({})
  const [simulating, setSimulating] = useState<string | null>(null)
  const [simMessage, setSimMessage] = useState<string | null>(null)

  useEffect(() => {
    if (device.ports && window.api) {
      // Clear previous results
      setPqcResults({})
      device.ports.forEach(async (p) => {
        const res = await window.api.checkPqcStatus({
          port: p.port,
          serviceName: p.service,
          product: p.product,
          extraInfo: p.extraInfo
        })
        setPqcResults(prev => ({ ...prev, [p.port]: res }))
      })
    }
  }, [device])

  const handleRunSimulation = async (type: string) => {
    if (!window.api) return
    setSimulating(type)
    setSimMessage(null)
    try {
      const res = await window.api.runSimulation({ type, targetIp: device.ip })
      setSimMessage(res.message)
    } catch (err) {
      setSimMessage(`Erreur de simulation: ${String(err)}`)
    } finally {
      setSimulating(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* 1. Cryptographie Post-Quantique (PQC) */}
      <Card className="bg-navy-800/50 border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center text-teal">
            <PqcIcon className="w-4 h-4 mr-2" />
            Audit de Cryptographie Post-Quantique (PQC) & Crypto-Agilité
          </CardTitle>
          <p className="text-xs text-navy-300">
            Analyse de la robustesse cryptographique des services ouverts face aux futurs ordinateurs quantiques (Feuille de route NIST 2030-2031).
          </p>
        </CardHeader>
        <CardContent>
          {device.ports && device.ports.length > 0 ? (
            <div className="space-y-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-navy-900 border-b border-border">
                  <tr>
                    <th className="px-3 py-2 font-medium text-navy-200">Service</th>
                    <th className="px-3 py-2 font-medium text-navy-200">Statut Quantique</th>
                    <th className="px-3 py-2 font-medium text-navy-200">Algorithmes Détectés</th>
                    <th className="px-3 py-2 font-medium text-navy-200">Recommandations</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {device.ports.map((p, i) => {
                    const result = pqcResults[p.port]
                    if (!result) return (
                      <tr key={i}>
                        <td className="px-3 py-2 font-mono text-teal">{p.port}/{p.protocol} ({p.service})</td>
                        <td className="px-3 py-2 text-navy-400" colSpan={3}>Analyse en cours...</td>
                      </tr>
                    )
                    return (
                      <tr key={i} className="hover:bg-navy-800/30 transition-colors">
                        <td className="px-3 py-2 font-mono">
                          <span className="text-teal font-bold">{p.port}/{p.protocol}</span>
                          <span className="text-navy-300 block text-[10px]">{p.service || 'unknown'}</span>
                        </td>
                        <td className="px-3 py-2">
                          {result.isQuantumReady ? (
                            <Badge variant="outline" className="border-teal/50 text-teal bg-teal/5 text-[10px] font-bold">QUANTUM SAFE</Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-red-950 text-red-400 border border-red-900 text-[10px] font-bold">VULNÉRABLE (MENACE HNDL)</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-300 max-w-[200px] truncate">
                          {result.algorithmsFound.join(', ')}
                        </td>
                        <td className="px-3 py-2 text-navy-200 max-w-[300px]">
                          <ul className="list-disc pl-4 space-y-0.5 text-[10px]">
                            {result.recommendations.map((rec, rIdx) => (
                              <li key={rIdx}>{rec}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="bg-navy-950 p-3 rounded-lg border border-border flex items-start space-x-2 text-[10px] text-navy-300">
                <Info className="w-4 h-4 text-teal shrink-0 mt-0.5" />
                <p>
                  <strong>Menace "Harvest-Now-Decrypt-Later" (HNDL) :</strong> Un adversaire actif peut stocker vos données chiffrées SSH/SSL classiques aujourd'hui pour les déchiffrer dès l'apparition d'un ordinateur quantique. Configurez dès à présent le support TLS hybride (ML-KEM) et SSH (X25519-Kyber768) conformément à la section 6.6 du cahier des charges.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 text-center text-navy-400 text-xs">
              Aucun service découvert sur cet hôte. Veuillez lancer un Fingerprint.
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. Exposition Continue & Simulations (CTEM / BAS) */}
      <Card className="bg-navy-800/50 border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold flex items-center text-teal">
            <CtemIcon className="w-4 h-4 mr-2" />
            Gestion Continue de l'Exposition aux Menaces (CTEM) - Simulations
          </CardTitle>
          <p className="text-xs text-navy-300">
            Déclenchez des simulations d'attaques Breach & Attack Simulation (BAS) pour auditer en temps réel l'orchestration multi-agent et la couche de validation PDDL.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-navy-900/50 p-3 rounded border border-border flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Simulation ARP Spoofing</span>
                <span className="text-[10px] text-navy-400 block mt-1">Simule une attaque d'interception ARP. Teste l'agent d'isolement L2 supervisé par PDDL.</span>
              </div>
              <Button 
                onClick={() => handleRunSimulation('arp-spoof')} 
                disabled={simulating !== null} 
                className="mt-3 text-[10px] py-1 h-7"
              >
                {simulating === 'arp-spoof' ? 'Simulation...' : 'Lancer Simulation'}
              </Button>
            </div>

            <div className="bg-navy-900/50 p-3 rounded border border-border flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Simulation Port Scan</span>
                <span className="text-[10px] text-navy-400 block mt-1">Simule un balayage agressif. Vérifie la fonction de triage et de dé-duplication L1 de l'IA.</span>
              </div>
              <Button 
                onClick={() => handleRunSimulation('port-scan')} 
                disabled={simulating !== null} 
                className="mt-3 text-[10px] py-1 h-7"
              >
                {simulating === 'port-scan' ? 'Simulation...' : 'Lancer Simulation'}
              </Button>
            </div>

            <div className="bg-navy-900/50 p-3 rounded border border-border flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-slate-200 block">Simulation Migration PQC</span>
                <span className="text-[10px] text-navy-400 block mt-1">Simule l'application d'un correctif cryptographique post-quantique.</span>
              </div>
              <Button 
                onClick={() => handleRunSimulation('pqc-migration')} 
                disabled={simulating !== null} 
                className="mt-3 text-[10px] py-1 h-7"
              >
                {simulating === 'pqc-migration' ? 'Simulation...' : 'Lancer Simulation'}
              </Button>
            </div>
          </div>

          {simMessage && (
            <div className="bg-teal/10 p-3 rounded border border-teal/30 text-xs text-slate-200 space-y-1">
              <span className="font-bold text-teal text-[10px] uppercase block">Résultat de la Simulation CTEM</span>
              <p>{simMessage}</p>
              <p className="text-[9px] text-navy-300 mt-2 italic">
                Note : Ouvrez le panneau "AI Sentinel & SOC Agent" à droite (bouton flottant AI) et basculez sur l'onglet "Agentic SOC & PDDL" pour inspecter les logs détaillés et la validation logique PDDL.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export function FingerprintPage() {
  const { activeSessionId } = useAppStore()
  const [activeTab, setActiveTab] = useState<'overview' | 'ports' | 'vulns' | 'pqc'>('overview')
  const [devices, setDevices] = useState<DeviceWithVulns[]>([])
  const [filteredDevices, setFilteredDevices] = useState<DeviceWithVulns[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDevice, setSelectedDevice] = useState<DeviceWithVulns | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState<{phase: string, percent: number} | null>(null)

  useEffect(() => {
    if (activeSessionId && window.api) {
      loadDevices()
    } else {
      setDevices([])
      setFilteredDevices([])
      setSelectedDevice(null)
    }
  }, [activeSessionId])

  const loadDevices = async () => {
    if (!activeSessionId) return
    const res = await window.api.getSessionDevices(activeSessionId)
    if (res.success && res.devices) {
      setDevices(res.devices)
      setFilteredDevices(res.devices)
      if (selectedDevice) {
        const updated = res.devices.find((d: any) => d.id === selectedDevice.id)
        if (updated) setSelectedDevice(updated)
      }
    }
  }

  useEffect(() => {
    const q = searchQuery.toLowerCase()
    setFilteredDevices(devices.filter(d => 
      d.ip.toLowerCase().includes(q) || 
      (d.os?.name || '').toLowerCase().includes(q) || 
      (d.hostname || '').toLowerCase().includes(q)
    ))
  }, [searchQuery, devices])

  const handleStartScan = async () => {
    if (!activeSessionId || !selectedDevice) return
    setIsScanning(true)
    setScanProgress({ phase: 'Initializing Nmap NSE...', percent: 0 })
    
    if (window.api) {
      const unsubProgress = window.api.on('fingerprint:progress', (p: any) => {
        setScanProgress(p)
      })
      const unsubComplete = window.api.on('fingerprint:complete', () => {
        setIsScanning(false)
        setScanProgress(null)
        unsubProgress()
        unsubComplete()
        loadDevices()
      })
      const unsubError = window.api.on('fingerprint:error', (err: any) => {
        setIsScanning(false)
        setScanProgress(null)
        alert(`Fingerprint failed: ${err.error}`)
        unsubProgress()
        unsubComplete()
        unsubError()
      })
      
      await window.api.startFingerprint(activeSessionId, { 
        ip: selectedDevice.ip, 
        deviceId: selectedDevice.id, 
        checkVulns: true,
        timeout: 120
      })
    }
  }

  const getRiskColor = (vulns?: Vulnerability[]) => {
    if (!vulns || vulns.length === 0) return 'text-teal'
    const hasHigh = vulns.some(v => v.severity === 'high' || v.severity === 'critical')
    if (hasHigh) return 'text-red-500'
    const hasMed = vulns.some(v => v.severity === 'medium')
    if (hasMed) return 'text-orange-400'
    return 'text-yellow-400'
  }

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left side: Device List */}
      <div className="w-1/3 border-r border-border flex flex-col bg-navy-900/30">
        <div className="p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-slate-100 flex items-center">
            <MonitorIcon className="w-5 h-5 mr-2 text-teal" /> Discovered Devices
          </h2>
          <div className="relative mt-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-navy-900 border border-border rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-teal text-slate-100"
              placeholder="Filter by IP, Hostname or OS..."
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
          {filteredDevices.length > 0 ? filteredDevices.map(device => (
            <div 
              key={device.id} 
              onClick={() => !isScanning && setSelectedDevice(device)}
              className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedDevice?.id === device.id ? 'bg-teal/10 border-teal shadow-[0_0_10px_rgba(45,212,191,0.2)]' : 'bg-navy-800 border-border hover:border-teal/50'} ${isScanning ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex justify-between items-start">
                <div className="font-bold text-slate-100">{device.ip}</div>
                {device.vulnerabilities && device.vulnerabilities.length > 0 && (
                  <Badge variant="destructive" className="text-[10px]">{device.vulnerabilities.length} CVEs</Badge>
                )}
              </div>
              <div className="text-xs text-navy-300 mt-1 truncate">{device.os?.name || device.vendor || 'Unknown OS'}</div>
              <div className="text-[10px] text-teal font-mono mt-1">{device.mac || 'No MAC'}</div>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center py-10 text-navy-300">
              <Search className="w-8 h-8 mb-2 opacity-20" />
              <p className="text-sm">No devices found in this session.</p>
            </div>
          )}
        </div>
      </div>

      {/* Right side: Device Detail */}
      <div className="flex-1 flex flex-col overflow-hidden bg-navy-900/10">
        {!selectedDevice ? (
          <div className="flex-1 flex flex-col items-center justify-center text-navy-300">
            <Fingerprint className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <h2 className="text-xl font-semibold text-slate-100">No Target Selected</h2>
            <p className="mt-2 text-sm">Select a device from the list to begin deep fingerprinting.</p>
          </div>
        ) : (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-border bg-navy-800/50">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-3xl font-bold text-slate-100 flex items-center">
                    {selectedDevice.ip}
                  </h1>
                  <p className="text-navy-200 mt-1 flex items-center">
                    <Cpu className="w-4 h-4 mr-2" /> {selectedDevice.os?.name || selectedDevice.vendor || 'Unknown OS'}
                  </p>
                </div>
                <div>
                  {isScanning ? (
                    <div className="flex flex-col items-end">
                      <div className="flex items-center text-teal text-sm font-medium animate-pulse mb-2">
                        <Activity className="w-4 h-4 mr-2" /> {scanProgress?.phase || 'Scanning...'}
                      </div>
                      {scanProgress?.percent !== undefined && scanProgress.percent >= 0 && (
                        <div className="w-48 h-2 bg-navy-900 rounded-full overflow-hidden border border-border">
                          <div className="h-full bg-teal transition-all duration-300 shadow-[0_0_8px_rgba(45,212,191,0.8)]" style={{ width: `${scanProgress.percent}%` }}></div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button onClick={handleStartScan} className="shadow-[0_0_15px_rgba(45,212,191,0.3)]">
                      <Fingerprint className="w-4 h-4 mr-2" /> Start Deep Fingerprint
                    </Button>
                  )}
                </div>
              </div>
              
              {/* Tabs */}
              <div className="flex space-x-6 mt-8 border-b border-border">
                <button 
                  onClick={() => setActiveTab('overview')}
                  className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'overview' ? 'text-teal' : 'text-navy-300 hover:text-slate-100'}`}
                >
                  Overview
                  {activeTab === 'overview' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-teal shadow-[0_0_8px_rgba(45,212,191,0.8)]"></div>}
                </button>
                <button 
                  onClick={() => setActiveTab('ports')}
                  className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'ports' ? 'text-teal' : 'text-navy-300 hover:text-slate-100'}`}
                >
                  Ports & Services {selectedDevice.ports && <Badge variant="secondary" className="ml-1 text-[10px]">{selectedDevice.ports.length}</Badge>}
                  {activeTab === 'ports' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-teal shadow-[0_0_8px_rgba(45,212,191,0.8)]"></div>}
                </button>
                <button 
                  onClick={() => setActiveTab('vulns')}
                  className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'vulns' ? 'text-teal' : 'text-navy-300 hover:text-slate-100'}`}
                >
                  Vulnerabilities {selectedDevice.vulnerabilities && <Badge variant={selectedDevice.vulnerabilities.length > 0 ? 'destructive' : 'secondary'} className="ml-1 text-[10px]">{selectedDevice.vulnerabilities.length}</Badge>}
                  {activeTab === 'vulns' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-teal shadow-[0_0_8px_rgba(45,212,191,0.8)]"></div>}
                </button>
                <button 
                  onClick={() => setActiveTab('pqc')}
                  className={`pb-2 text-sm font-medium transition-colors relative ${activeTab === 'pqc' ? 'text-teal' : 'text-navy-300 hover:text-slate-100'}`}
                >
                  PQC & CTEM Audit
                  {activeTab === 'pqc' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-teal shadow-[0_0_8px_rgba(45,212,191,0.8)]"></div>}
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
              {activeTab === 'overview' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-navy-800/50 border-border">
                    <CardHeader>
                      <CardTitle className="text-sm">Device Identity</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="text-xs text-navy-300 mb-1">MAC Address</div>
                        <div className="font-mono text-slate-100 bg-navy-900 p-2 rounded border border-border inline-block">{selectedDevice.mac || 'Unknown'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-navy-300 mb-1">Hardware Vendor</div>
                        <div className="text-slate-100">{selectedDevice.vendor || 'Unknown'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-navy-300 mb-1">Hostname</div>
                        <div className="text-slate-100">{selectedDevice.hostname || 'None'}</div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-navy-800/50 border-border">
                    <CardHeader>
                      <CardTitle className="text-sm">Security Posture</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center justify-center py-6">
                      <ShieldCheck className={`w-20 h-20 mb-4 ${getRiskColor(selectedDevice.vulnerabilities)}`} />
                      <h3 className="text-2xl font-bold text-slate-100">
                        {selectedDevice.vulnerabilities && selectedDevice.vulnerabilities.length > 0 
                          ? `${selectedDevice.vulnerabilities.length} Vulns Detected` 
                          : 'No Known Vulns'}
                      </h3>
                      <p className="text-sm text-navy-300 mt-2 text-center">
                        {selectedDevice.vulnerabilities === undefined 
                          ? 'Run a Deep Fingerprint to discover CVEs.' 
                          : 'Based on NVD database correlation.'}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === 'ports' && (
                <div className="bg-navy-800/50 rounded-lg border border-border overflow-hidden">
                  {selectedDevice.ports && selectedDevice.ports.length > 0 ? (
                    <table className="w-full text-left text-sm">
                      <thead className="bg-navy-900 border-b border-border">
                        <tr>
                          <th className="px-4 py-3 font-medium text-navy-200">Port</th>
                          <th className="px-4 py-3 font-medium text-navy-200">State</th>
                          <th className="px-4 py-3 font-medium text-navy-200">Service</th>
                          <th className="px-4 py-3 font-medium text-navy-200">Version</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {selectedDevice.ports.map((p, i) => (
                          <tr key={i} className="hover:bg-navy-800 transition-colors">
                            <td className="px-4 py-3 font-mono text-teal">{p.port}/{p.protocol}</td>
                            <td className="px-4 py-3"><Badge variant="outline" className="border-teal/50 text-teal">{p.state}</Badge></td>
                            <td className="px-4 py-3 text-slate-100">{p.service || '-'}</td>
                            <td className="px-4 py-3 text-navy-200">{p.version || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="p-8 text-center text-navy-300">
                      <Server className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No open ports discovered. Run a Deep Fingerprint.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'vulns' && (
                <div className="space-y-4">
                  {selectedDevice.vulnerabilities && selectedDevice.vulnerabilities.length > 0 ? (
                    selectedDevice.vulnerabilities.map((v, i) => (
                      <Card key={i} className="border-l-4 border-l-red-500 bg-navy-800/50 border-t-border border-r-border border-b-border">
                        <CardHeader className="py-3 px-4 flex flex-row items-start justify-between">
                          <div>
                            <CardTitle className="text-sm font-bold text-slate-100 flex items-center">
                              {v.cveId || 'Vulnerability'}
                              {v.exploitAvailable && <Badge variant="destructive" className="ml-3 text-[10px]">Exploit Public</Badge>}
                            </CardTitle>
                            <p className="text-xs text-navy-300 mt-1">{v.title}</p>
                          </div>
                          <Badge variant={v.severity === 'high' || v.severity === 'critical' ? 'destructive' : v.severity === 'medium' ? 'default' : 'secondary'} className="uppercase">
                            {v.severity} {v.cvss?.score ? `(${v.cvss.score})` : ''}
                          </Badge>
                        </CardHeader>
                        <CardContent className="px-4 pb-4">
                          <p className="text-sm text-navy-200 bg-navy-900 p-3 rounded border border-border">
                            {v.description || 'No description available.'}
                          </p>
                          {v.solution && (
                            <div className="mt-3">
                              <span className="text-xs font-bold text-teal">Solution:</span>
                              <p className="text-sm text-slate-100 mt-1">{v.solution}</p>
                            </div>
                          )}
                          <div className="mt-3 flex gap-2">
                            {v.port && <Badge variant="outline" className="border-navy-600">Port: {v.port}</Badge>}
                            {v.service && <Badge variant="outline" className="border-navy-600">Service: {v.service}</Badge>}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <div className="bg-navy-800/50 rounded-lg border border-border p-8 text-center text-navy-300">
                      <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No vulnerabilities discovered. The target appears secure or hasn't been deep scanned.</p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'pqc' && (
                <PqcTab device={selectedDevice} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
