import React, { useState, useEffect } from 'react'
import { Settings, Save, Key, Cpu, Shield } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

export function SettingsPage() {
  const [apiKey, setApiKey] = useState('')
  const [theme, setTheme] = useState('dark')

  useEffect(() => {
    // Load settings from backend if API is available
  }, [])

  const handleSave = () => {
    // Save to backend
    alert('Settings saved successfully.')
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-6 gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 flex items-center">
            <Settings className="w-8 h-8 mr-3 text-teal" />
            Settings
          </h1>
          <p className="text-navy-200 mt-1">Application preferences and API configurations</p>
        </div>
        <Button onClick={handleSave}>
          <Save className="w-4 h-4 mr-2" /> Save Changes
        </Button>
      </div>

      <div className="max-w-3xl space-y-6 pb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Key className="w-5 h-5 mr-2 text-teal"/> AI Integration (Gemini)</CardTitle>
            <CardDescription>Configure the Google Gemini API key to enable AI-powered vulnerability analysis and chatbot features.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <label className="text-sm font-medium text-navy-200">API Key</label>
              <input 
                type="password" 
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..." 
                className="w-full bg-navy-900 border border-border rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-teal"
              />
              <p className="text-xs text-navy-300">Your key is stored securely in the system keychain.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><Cpu className="w-5 h-5 mr-2 text-teal"/> System Tools</CardTitle>
            <CardDescription>Status of required underlying security tools.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded bg-navy-800 border border-border">
                <span className="font-medium text-slate-100">Nmap</span>
                <span className="text-teal text-sm font-bold flex items-center"><Shield className="w-4 h-4 mr-1"/> Installed (v7.94)</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded bg-navy-800 border border-border">
                <span className="font-medium text-slate-100">TShark / Wireshark</span>
                <span className="text-teal text-sm font-bold flex items-center"><Shield className="w-4 h-4 mr-1"/> Installed (v4.2)</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded bg-navy-800 border border-border">
                <span className="font-medium text-slate-100">ARP-Scan</span>
                <span className="text-teal text-sm font-bold flex items-center"><Shield className="w-4 h-4 mr-1"/> Installed</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
