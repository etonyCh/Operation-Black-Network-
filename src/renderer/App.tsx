/**
 * @fileoverview Application Root Component
 * Pour plus d'informations sur l'architecture de ce module et du projet,
 * veuillez consulter le dossier /docs/ à la racine du projet.
 */
import React from 'react'
import { Layout } from './components/layout/Layout'
import { useAppStore } from './store/useAppStore'
import { NetworkMapPage } from './pages/NetworkMapPage'
import { FingerprintPage } from './pages/FingerprintPage'
import { TrafficPage } from './pages/TrafficPage'
import { ProxyPage } from './pages/ProxyPage'
import { HistoryPage } from './pages/HistoryPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'

function App() {
  const { currentPage } = useAppStore()

  const renderPage = () => {
    switch (currentPage) {
      case 'network-map': return <NetworkMapPage />
      case 'fingerprint': return <FingerprintPage />
      case 'traffic': return <TrafficPage />
      case 'proxy': return <ProxyPage />
      case 'history': return <HistoryPage />
      case 'reports': return <ReportsPage />
      case 'settings': return <SettingsPage />
      default: return <HistoryPage />
    }
  }

  return (
    <Layout>
      {renderPage()}
    </Layout>
  )
}

export default App
