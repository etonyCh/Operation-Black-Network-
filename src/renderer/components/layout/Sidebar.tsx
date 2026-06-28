import React from 'react'
import { Network, Fingerprint, Activity, ShieldAlert, History, Settings, FileText } from 'lucide-react'
import { useAppStore, Page } from '../../store/useAppStore'
import { cn } from '../../lib/utils'

const navItems: { id: Page; label: string; icon: React.FC<any> }[] = [
  { id: 'network-map', label: 'Network Map', icon: Network },
  { id: 'fingerprint', label: 'Fingerprint', icon: Fingerprint },
  { id: 'traffic', label: 'Traffic', icon: Activity },
  { id: 'proxy', label: 'Proxy', icon: ShieldAlert },
  { id: 'history', label: 'History', icon: History },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const { currentPage, setCurrentPage } = useAppStore()

  return (
    <aside className="w-64 border-r border-border bg-panel-dark/50 backdrop-blur-md flex flex-col">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <ShieldAlert className="w-6 h-6 text-teal mr-2" />
        <span className="text-lg font-bold text-slate-100 tracking-wide">Black Network</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = currentPage === item.id
          const Icon = item.icon
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={cn(
                'w-full flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors',
                isActive 
                  ? 'bg-teal/10 text-teal' 
                  : 'text-navy-200 hover:bg-navy-800 hover:text-slate-100'
              )}
            >
              <Icon className={cn('w-5 h-5 mr-3', isActive ? 'text-teal' : 'text-navy-300')} />
              {item.label}
            </button>
          )
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <div className="text-xs text-navy-400 text-center">
          Ubuntu 24.04 LTS
        </div>
      </div>
    </aside>
  )
}
