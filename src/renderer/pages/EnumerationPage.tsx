import React, { useState, useEffect } from 'react'
import { Search, Globe, Folder, Play, Square, Loader2, Info } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useAppStore } from '../store/useAppStore'
import type { DirectoryResult, DnsResult, EnumProgress } from '../../preload/api'

export function EnumerationPage() {
  const { activeSessionId } = useAppStore()
  const [activeTab, setActiveTab] = useState<'dir' | 'dns'>('dir')
  const [isScanning, setIsScanning] = useState(false)
  const [currentScanId, setCurrentScanId] = useState<string | null>(null)

  // Web Directory scan state
  const [targetUrl, setTargetUrl] = useState('http://localhost:5173')
  const [dirResults, setDirResults] = useState<DirectoryResult[]>([])
  const [dirProgress, setDirProgress] = useState<EnumProgress>({ percent: 0, count: 0, total: 0 })

  // DNS scan state
  const [targetDomain, setTargetDomain] = useState('google.com')
  const [dnsResults, setDnsResults] = useState<DnsResult[]>([])
  const [dnsProgress, setDnsProgress] = useState<EnumProgress>({ percent: 0, count: 0, total: 0 })

  // Register Electron listeners
  useEffect(() => {
    if (!window.api) return

    // Directory enum callbacks
    const unsubResult = window.api.on('sota:enum-dir-result', (data: any) => {
      if (data.scanId === currentScanId) {
        setDirResults(prev => {
          // Prevent duplicates
          if (prev.some(r => r.path === data.result.path)) return prev
          return [data.result, ...prev]
        })
      }
    })

    const unsubProgress = window.api.on('sota:enum-dir-progress', (data: any) => {
      if (data.scanId === currentScanId) {
        setDirProgress(data.progress)
      }
    })

    const unsubComplete = window.api.on('sota:enum-dir-complete', (data: any) => {
      if (data.scanId === currentScanId) {
        setIsScanning(false)
        setCurrentScanId(null)
        if (data.status.error) {
          alert(`Erreur de scan de répertoires : ${data.status.error}`)
        }
      }
    })

    // DNS enum callbacks
    const unsubDnsResult = window.api.on('sota:enum-dns-result', (data: any) => {
      if (data.scanId === currentScanId) {
        setDnsResults(prev => {
          if (prev.some(r => r.host === data.result.host && r.recordType === data.result.recordType && r.value === data.result.value)) return prev
          return [data.result, ...prev]
        })
      }
    })

    const unsubDnsProgress = window.api.on('sota:enum-dns-progress', (data: any) => {
      if (data.scanId === currentScanId) {
        setDnsProgress(data.progress)
      }
    })

    const unsubDnsComplete = window.api.on('sota:enum-dns-complete', (data: any) => {
      if (data.scanId === currentScanId) {
        setIsScanning(false)
        setCurrentScanId(null)
        if (data.status.error) {
          alert(`Erreur d'audit DNS : ${data.status.error}`)
        }
      }
    })

    return () => {
      unsubResult()
      unsubProgress()
      unsubComplete()
      unsubDnsResult()
      unsubDnsProgress()
      unsubDnsComplete()
    }
  }, [currentScanId])

  const handleStartDirScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeSessionId) {
      alert("Veuillez sélectionner ou créer une session dans History en premier lieu.")
      return
    }
    if (isScanning) return

    setDirResults([])
    setDirProgress({ percent: 0, count: 0, total: 0 })
    setIsScanning(true)

    try {
      const res = await window.api.startDirectoryEnum({ targetUrl })
      if (res.success && res.scanId) {
        setCurrentScanId(res.scanId)
      } else {
        setIsScanning(false)
        alert(`Impossible d'initier le scan : ${res.error || 'Erreur inconnue'}`)
      }
    } catch (err: any) {
      setIsScanning(false)
      alert(`Erreur : ${err.message || err}`)
    }
  }

  const handleStopDirScan = async () => {
    if (!currentScanId) return
    await window.api.stopDirectoryEnum({ scanId: currentScanId })
    setIsScanning(false)
    setCurrentScanId(null)
  }

  const handleStartDnsScan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeSessionId) {
      alert("Veuillez sélectionner ou créer une session dans History en premier lieu.")
      return
    }
    if (isScanning) return

    setDnsResults([])
    setDnsProgress({ percent: 0, count: 0, total: 0 })
    setIsScanning(true)

    try {
      const res = await window.api.startDnsEnum({ domain: targetDomain })
      if (res.success && res.scanId) {
        setCurrentScanId(res.scanId)
      } else {
        setIsScanning(false)
        alert(`Impossible d'initier le scan DNS : ${res.error || 'Erreur inconnue'}`)
      }
    } catch (err: any) {
      setIsScanning(false)
      alert(`Erreur : ${err.message || err}`)
    }
  }

  const handleStopDnsScan = async () => {
    if (!currentScanId) return
    await window.api.stopDnsEnum({ scanId: currentScanId })
    setIsScanning(false)
    setCurrentScanId(null)
  }

  const getStatusBadge = (status: number) => {
    if (status >= 200 && status < 300) return <Badge variant="success">{status} OK</Badge>
    if (status >= 300 && status < 400) return <Badge variant="secondary">{status} Redirect</Badge>
    if (status >= 400 && status < 500) return <Badge variant="warning">{status} Forbidden</Badge>
    return <Badge variant="destructive">{status} Error</Badge>
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 gap-6 relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center">
            <Search className="w-8 h-8 mr-3 text-teal" />
            Active Enumeration
          </h1>
          <p className="text-navy-200 mt-1">Énumération active et résolution de cibles web ou DNS locales.</p>
        </div>
        <div className="flex items-center space-x-2 glass-panel p-1 rounded-lg">
          <button
            onClick={() => { if (!isScanning) setActiveTab('dir') }}
            disabled={isScanning}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${activeTab === 'dir' ? 'bg-teal/10 text-teal' : 'text-navy-300 hover:text-slate-100 disabled:opacity-50'}`}
          >
            <Folder className="w-4 h-4 inline mr-2" /> Web Directory
          </button>
          <button
            onClick={() => { if (!isScanning) setActiveTab('dns') }}
            disabled={isScanning}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-all ${activeTab === 'dns' ? 'bg-teal/10 text-teal' : 'text-navy-300 hover:text-slate-100 disabled:opacity-50'}`}
          >
            <Globe className="w-4 h-4 inline mr-2" /> DNS & Subdomains
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 flex-1 overflow-hidden">
        {/* Left Form Panel */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <Card className="bg-navy-900/50 border-border">
            <CardHeader className="py-4 border-b border-border">
              <CardTitle className="text-sm font-medium flex items-center">
                Paramètres de la Cible
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {activeTab === 'dir' ? (
                <form onSubmit={handleStartDirScan} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs text-navy-200">URL du Serveur Web</label>
                    <input
                      type="text"
                      value={targetUrl}
                      onChange={(e) => setTargetUrl(e.target.value)}
                      disabled={isScanning}
                      placeholder="e.g. http://localhost:5173"
                      className="w-full bg-navy-900 border border-border rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal disabled:opacity-50"
                      required
                    />
                  </div>
                  <div className="space-y-2 text-[10px] text-navy-300 flex items-start gap-1">
                    <Info className="w-3.5 h-3.5 text-teal shrink-0 mt-0.5" />
                    <span>L'énumération s'effectue de manière asynchrone sur une liste de 40 chemins critiques.</span>
                  </div>
                  <div className="pt-2">
                    {isScanning ? (
                      <Button variant="destructive" className="w-full text-xs" onClick={handleStopDirScan} type="button">
                        <Square className="w-4 h-4 mr-2" /> Arrêter l'Audit
                      </Button>
                    ) : (
                      <Button className="w-full text-xs" type="submit">
                        <Play className="w-4 h-4 mr-2" /> Lancer l'Audit Web
                      </Button>
                    )}
                  </div>
                </form>
              ) : (
                <form onSubmit={handleStartDnsScan} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs text-navy-200">Nom de Domaine</label>
                    <input
                      type="text"
                      value={targetDomain}
                      onChange={(e) => setTargetDomain(e.target.value)}
                      disabled={isScanning}
                      placeholder="e.g. google.com"
                      className="w-full bg-navy-900 border border-border rounded px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal disabled:opacity-50"
                      required
                    />
                  </div>
                  <div className="space-y-2 text-[10px] text-navy-300 flex items-start gap-1">
                    <Info className="w-3.5 h-3.5 text-teal shrink-0 mt-0.5" />
                    <span>Audit des résolutions DNS standard, suivi d'un scan de 36 sous-domaines fréquents.</span>
                  </div>
                  <div className="pt-2">
                    {isScanning ? (
                      <Button variant="destructive" className="w-full text-xs" onClick={handleStopDnsScan} type="button">
                        <Square className="w-4 h-4 mr-2" /> Arrêter l'Audit
                      </Button>
                    ) : (
                      <Button className="w-full text-xs" type="submit">
                        <Play className="w-4 h-4 mr-2" /> Lancer l'Audit DNS
                      </Button>
                    )}
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {isScanning && (
            <Card className="bg-navy-900/50 border-border animate-pulse">
              <CardHeader className="py-3 px-4 border-b border-border">
                <CardTitle className="text-xs font-semibold text-teal flex items-center">
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Progression de l'Audit
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-navy-300">Statut</span>
                  <span className="text-slate-100 font-medium">Audit en cours</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-navy-300">Requêtes</span>
                  <span className="text-slate-100 font-medium font-mono">
                    {activeTab === 'dir' ? `${dirProgress.count} / ${dirProgress.total}` : `${dnsProgress.count} / ${dnsProgress.total}`}
                  </span>
                </div>
                <div className="w-full bg-navy-800 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-teal h-full transition-all duration-300"
                    style={{ width: `${activeTab === 'dir' ? dirProgress.percent : dnsProgress.percent}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Feed Panel */}
        <div className="lg:col-span-3 flex flex-col gap-6 overflow-hidden">
          <Card className="flex-1 flex flex-col overflow-hidden bg-navy-900/50 border-border">
            <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">
                {activeTab === 'dir' ? 'Résultats Directory Bruteforcing' : 'Résultats Énumération DNS'}
              </CardTitle>
              <Badge variant="secondary">
                {activeTab === 'dir' ? dirResults.length : dnsResults.length} trouvés
              </Badge>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0 font-mono text-xs custom-scrollbar">
              {activeTab === 'dir' ? (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-navy-800 sticky top-0 z-10 shadow-md">
                    <tr>
                      <th className="px-4 py-2 font-medium text-navy-200 w-1/2">Chemin / URL Découverte</th>
                      <th className="px-4 py-2 font-medium text-navy-200">Code d'État</th>
                      <th className="px-4 py-2 font-medium text-navy-200">Taille Réponse</th>
                      <th className="px-4 py-2 font-medium text-navy-200">Redirection</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {dirResults.length > 0 ? dirResults.map((r, idx) => (
                      <tr key={idx} className="hover:bg-navy-800/50 transition-colors">
                        <td className="px-4 py-2 text-teal font-bold select-all">{r.path}</td>
                        <td className="px-4 py-2">{getStatusBadge(r.status)}</td>
                        <td className="px-4 py-2 text-navy-300 font-mono">{r.length} bytes</td>
                        <td className="px-4 py-2 text-navy-400 select-all truncate max-w-xs" title={r.redirectUrl}>{r.redirectUrl || '-'}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} className="px-4 py-12 text-center text-navy-300">
                          {isScanning ? 'Scan des répertoires en cours...' : "Aucun audit lancé. Saisissez une URL cible et cliquez sur Lancer."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-navy-800 sticky top-0 z-10 shadow-md">
                    <tr>
                      <th className="px-4 py-2 font-medium text-navy-200 w-1/3">Cible / Hôte résolu</th>
                      <th className="px-4 py-2 font-medium text-navy-200">Type d'Enregistrement</th>
                      <th className="px-4 py-2 font-medium text-navy-200">Valeur / IP Renvoyée</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {dnsResults.length > 0 ? dnsResults.map((r, idx) => (
                      <tr key={idx} className="hover:bg-navy-800/50 transition-colors">
                        <td className="px-4 py-2 text-teal font-bold select-all">{r.host}</td>
                        <td className="px-4 py-2"><Badge variant="outline" className="border-teal/30 text-teal text-[10px]">{r.recordType}</Badge></td>
                        <td className="px-4 py-2 text-slate-200 font-mono select-all truncate max-w-md" title={r.value}>{r.value}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-12 text-center text-navy-300">
                          {isScanning ? 'Résolution et bruteforce DNS en cours...' : "Aucun audit DNS lancé. Saisissez un domaine et cliquez sur Lancer."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
