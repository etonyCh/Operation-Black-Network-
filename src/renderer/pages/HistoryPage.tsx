import React, { useState, useEffect } from 'react'
import { History, Plus, Trash2, ChevronRight, CheckCircle2 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useAppStore } from '../store/useAppStore'

interface Session {
  id: string
  name: string
  target: string
  createdAt: number
  deviceCount: number
  vulnCount: number
  riskScore: number
}

export function HistoryPage() {
  const { setActiveSessionId, activeSessionId, setCurrentPage } = useAppStore()
  const [sessions, setSessions] = useState<Session[]>([])

  useEffect(() => {
    const fetchSessions = async () => {
      if (window.api) {
        const result = await window.api.listSessions()
        if (result.success && result.sessions) {
          setSessions(result.sessions)
        }
      }
    }
    fetchSessions()
  }, [])

  const [showDialog, setShowDialog] = useState(false)
  const [newSessionName, setNewSessionName] = useState('')
  const [newSessionTarget, setNewSessionTarget] = useState('')

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSessionName || !newSessionTarget) return

    if (window.api) {
      const result = await window.api.createSession({ name: newSessionName, target: newSessionTarget })
      if (result.success && result.session) {
        setSessions(prev => [result.session as Session, ...prev])
        setActiveSessionId(result.session.id)
        setCurrentPage('network-map')
      }
    }
    setShowDialog(false)
    setNewSessionName('')
    setNewSessionTarget('')
  }

  const handleDeleteSession = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm("Are you sure you want to delete this session?")) {
      if (window.api) {
        await window.api.deleteSession(id)
      }
      setSessions(prev => prev.filter(s => s.id !== id))
      if (activeSessionId === id) setActiveSessionId(null)
    }
  }

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id)
    setCurrentPage('network-map')
  }

  const getRiskBadge = (score: number) => {
    if (score >= 9) return <Badge variant="destructive">Critical Risk</Badge>
    if (score >= 7) return <Badge variant="warning">High Risk</Badge>
    if (score >= 4) return <Badge variant="secondary">Medium Risk</Badge>
    return <Badge variant="success">Low Risk</Badge>
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center">
            <History className="w-8 h-8 mr-3 text-teal" />
            Sessions & History
          </h1>
          <p className="text-navy-200 mt-1">Manage your penetration testing and audit sessions</p>
        </div>
        <Button onClick={() => setShowDialog(true)}>
          <Plus className="w-4 h-4 mr-2" /> New Session
        </Button>
      </div>

      {showDialog && (
        <Card className="border-teal ring-1 ring-teal/50 mb-4 animate-in fade-in slide-in-from-top-4">
          <CardHeader>
            <CardTitle>Create New Session</CardTitle>
            <CardDescription>Enter the details for your new network audit session.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-navy-200">Session Name</label>
                <input 
                  type="text" 
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="e.g. Home Network Scan" 
                  className="w-full bg-navy-900 border border-border rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-teal"
                  autoFocus
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm text-navy-200">Target IP/Subnet</label>
                <input 
                  type="text" 
                  value={newSessionTarget}
                  onChange={(e) => setNewSessionTarget(e.target.value)}
                  placeholder="e.g. 192.168.1.0/24" 
                  className="w-full bg-navy-900 border border-border rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-teal"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2 pt-2">
                <Button type="button" variant="ghost" onClick={() => setShowDialog(false)}>Cancel</Button>
                <Button type="submit">Create & Start</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 overflow-y-auto pb-8">
        {sessions.map((session) => (
          <Card 
            key={session.id} 
            className={`cursor-pointer transition-all hover:border-teal/50 ${activeSessionId === session.id ? 'border-teal ring-1 ring-teal' : ''}`}
            onClick={() => handleSelectSession(session.id)}
          >
            <CardHeader className="flex flex-row items-start justify-between pb-2">
              <div>
                <CardTitle className="flex items-center">
                  {session.name}
                  {activeSessionId === session.id && (
                    <CheckCircle2 className="w-4 h-4 ml-2 text-teal" />
                  )}
                </CardTitle>
                <CardDescription className="mt-1 font-mono text-xs">{session.target}</CardDescription>
              </div>
              {getRiskBadge(session.riskScore)}
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mt-4">
                <div className="flex space-x-6 text-sm">
                  <div>
                    <p className="text-navy-300 text-xs uppercase tracking-wider">Devices</p>
                    <p className="font-semibold text-slate-100">{session.deviceCount}</p>
                  </div>
                  <div>
                    <p className="text-navy-300 text-xs uppercase tracking-wider">Vulns</p>
                    <p className="font-semibold text-accent">{session.vulnCount}</p>
                  </div>
                  <div>
                    <p className="text-navy-300 text-xs uppercase tracking-wider">Date</p>
                    <p className="font-medium text-slate-100">{new Date(session.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="ghost" size="icon" className="text-navy-300 hover:text-accent" onClick={(e) => handleDeleteSession(session.id, e)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => handleSelectSession(session.id)}>
                    Open <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        {sessions.length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-navy-300 glass-panel rounded-xl">
            <History className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-lg">No sessions found.</p>
            <p className="text-sm mt-1">Create a new session to start auditing.</p>
          </div>
        )}
      </div>
    </div>
  )
}
