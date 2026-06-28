import React from 'react'
import { FileText, Download, FileJson } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useAppStore } from '../store/useAppStore'

export function ReportsPage() {
  const { activeSessionId } = useAppStore()

  return (
    <div className="flex flex-col h-full overflow-hidden p-6 gap-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-100 flex items-center">
          <FileText className="w-8 h-8 mr-3 text-teal" />
          Reports
        </h1>
        <p className="text-navy-200 mt-1">Generate professional audit reports for your sessions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <Card className="hover:border-teal/50 transition-colors">
          <CardHeader>
            <CardTitle>Executive Summary</CardTitle>
            <CardDescription>High-level overview of risks and AI recommendations suitable for management.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full justify-start"><Download className="w-4 h-4 mr-2"/> Export PDF</Button>
            <Button variant="secondary" className="w-full justify-start"><FileJson className="w-4 h-4 mr-2"/> Export DOCX</Button>
          </CardContent>
        </Card>

        <Card className="hover:border-teal/50 transition-colors">
          <CardHeader>
            <CardTitle>Technical Audit Report</CardTitle>
            <CardDescription>Detailed findings including open ports, OS versions, and specific CVEs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full justify-start"><Download className="w-4 h-4 mr-2"/> Export PDF</Button>
            <Button variant="secondary" className="w-full justify-start"><FileJson className="w-4 h-4 mr-2"/> Export DOCX</Button>
          </CardContent>
        </Card>

        <Card className="hover:border-teal/50 transition-colors">
          <CardHeader>
            <CardTitle>Raw Data Export</CardTitle>
            <CardDescription>Export all session data as a Black Network JSON file for sharing.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full justify-start"><Download className="w-4 h-4 mr-2"/> Export .netsent</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
