import React, { useState, useEffect } from 'react'
import { Server, Download, CheckCircle, Loader2, AlertTriangle, TerminalSquare } from 'lucide-react'
import { Button } from './Button'
import type { DependencyStatus } from '@shared/types/api'

export function SetupOverlay({ onComplete }: { onComplete: () => void }) {
  const [missingDeps, setMissingDeps] = useState<DependencyStatus[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isInstalling, setIsInstalling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [installStatus, setInstallStatus] = useState<Record<string, 'pending' | 'installing' | 'done'>>({})

  useEffect(() => {
    checkDeps()
  }, [])

  const checkDeps = async () => {
    setIsLoading(true)
    if (window.api) {
      try {
        const missing = await window.api.getMissingDependencies()
        // Filter out non-required ones if needed, but for now we install all missing
        setMissingDeps(missing)
        if (missing.length === 0) {
          onComplete()
        }
      } catch (err) {
        setError(String(err))
      }
    }
    setIsLoading(false)
  }

  const handleInstall = async () => {
    setIsInstalling(true)
    setError(null)
    
    // Initialize statuses
    const initialStatus: Record<string, 'pending' | 'installing' | 'done'> = {}
    missingDeps.forEach(d => initialStatus[d.name] = 'pending')
    setInstallStatus(initialStatus)

    if (window.api) {
      const unsubProgress = window.api.on('dependency:install:progress', (data: any) => {
        setInstallStatus(prev => ({
          ...prev,
          [data.tool]: data.status
        }))
      })

      const unsubDone = window.api.on('dependency:install:done', () => {
        setIsInstalling(false)
        cleanup()
        onComplete()
      })

      const unsubError = window.api.on('dependency:install:error', (data: any) => {
        setIsInstalling(false)
        setError(data.error)
        cleanup()
      })

      const cleanup = () => {
        unsubProgress()
        unsubDone()
        unsubError()
      }

      const tools = missingDeps.map(d => d.name)
      await window.api.installDependencies(tools)
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-navy-950 flex flex-col items-center justify-center text-slate-100">
        <Loader2 className="w-12 h-12 text-teal animate-spin mb-4" />
        <h2 className="text-xl font-bold">Checking System Environment...</h2>
      </div>
    )
  }

  if (missingDeps.length === 0) {
    return null // Will trigger onComplete shortly
  }

  return (
    <div className="fixed inset-0 z-50 bg-navy-950/90 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-navy-900 border border-border shadow-2xl rounded-2xl max-w-lg w-full overflow-hidden">
        <div className="p-6 border-b border-border flex items-center space-x-4 bg-navy-800">
          <div className="w-12 h-12 bg-teal/20 rounded-full flex items-center justify-center">
            <Server className="w-6 h-6 text-teal" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-100">Initial Setup Required</h2>
            <p className="text-navy-300 text-sm">Black Network needs a few system tools to operate.</p>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-start space-x-3 text-red-400">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">{error}</div>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-200 uppercase tracking-wider mb-2">Tools to install</h3>
            {missingDeps.map(dep => (
              <div key={dep.name} className="flex items-center justify-between p-3 bg-navy-950 rounded-lg border border-border">
                <div className="flex items-center space-x-3">
                  <TerminalSquare className="w-5 h-5 text-navy-400" />
                  <div>
                    <div className="text-sm font-bold text-slate-100 capitalize">{dep.name}</div>
                    <div className="text-xs text-navy-400 font-mono">{dep.command}</div>
                  </div>
                </div>
                <div>
                  {installStatus[dep.name] === 'done' ? (
                    <span className="flex items-center text-green-400 text-sm font-medium">
                      <CheckCircle className="w-4 h-4 mr-1.5" /> Installed
                    </span>
                  ) : installStatus[dep.name] === 'installing' ? (
                    <span className="flex items-center text-teal text-sm font-medium">
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Installing...
                    </span>
                  ) : (
                    <span className="text-navy-400 text-xs uppercase tracking-widest font-bold">Pending</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-end">
            <Button 
              onClick={handleInstall} 
              disabled={isInstalling}
              className="bg-teal hover:bg-teal-600 text-navy-900 w-full font-bold shadow-[0_0_15px_rgba(20,184,166,0.4)]"
            >
              {isInstalling ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Installing...
                </>
              ) : (
                <>
                  <Download className="w-5 h-5 mr-2" /> Install Dependencies Now
                </>
              )}
            </Button>
          </div>
          <p className="text-center text-xs text-navy-400 mt-2">
            You may be prompted for your administrator password.
          </p>
        </div>
      </div>
    </div>
  )
}
