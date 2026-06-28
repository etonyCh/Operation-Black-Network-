import PDFDocument from 'pdfkit'
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  BorderStyle,
} from 'docx'
import { createWriteStream, mkdirSync } from 'fs'
import { join } from 'path'
import { app } from 'electron'
import { logger } from '@main/utils/logger'
import type { ReportOptions, ReportResult } from '@shared/types/report.types'
import type { Session } from '@shared/types/ipc.types'
import type { Device } from '@shared/types/device.types'
import type { Vulnerability } from '@shared/types/vulnerability.types'
import type { TrafficPacket, Credential, TrafficAlert } from '@shared/types/traffic.types'
import type { ProxyRequest } from '@shared/types/proxy.types'

export interface ReportData {
  session: Session
  devices: Device[]
  vulnerabilities: Vulnerability[]
  packets: TrafficPacket[]
  credentials: Credential[]
  alerts: TrafficAlert[]
  proxyRequests: ProxyRequest[]
  aiSummary?: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function severityColor(sev: string): string {
  switch (sev) {
    case 'critical':
      return '#DC2626'
    case 'high':
      return '#EA580C'
    case 'medium':
      return '#D97706'
    case 'low':
      return '#65A30D'
    default:
      return '#6B7280'
  }
}

function reportsDir(): string {
  const dir = join(app.getPath('documents'), 'Black Network Reports')
  mkdirSync(dir, { recursive: true })
  return dir
}

function outputPath(options: ReportOptions): string {
  const safeName = (options.title ?? options.sessionId).replace(/[^a-z0-9_-]/gi, '_')
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const ext = options.format === 'pdf' ? 'pdf' : 'docx'
  return join(reportsDir(), `${safeName}_${ts}.${ext}`)
}

// ---------------------------------------------------------------------------
// PDF generation
// ---------------------------------------------------------------------------

async function generatePdf(options: ReportOptions, data: ReportData): Promise<string> {
  const outPath = outputPath(options)
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: { Title: options.title ?? 'Security Report' },
  })
  const stream = createWriteStream(outPath)
  doc.pipe(stream)

  const title = options.title ?? 'Network Security Assessment Report'
  const company = options.companyName ?? ''
  const author = options.authorName ?? ''

  // Cover page
  doc.fontSize(28).fillColor('#1E3A5F').text(title, { align: 'center' })
  doc.moveDown()
  if (company) doc.fontSize(16).fillColor('#374151').text(company, { align: 'center' })
  if (author)
    doc.fontSize(12).fillColor('#6B7280').text(`Prepared by: ${author}`, { align: 'center' })
  doc
    .fontSize(12)
    .fillColor('#6B7280')
    .text(
      `Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      { align: 'center' }
    )
  doc.moveDown(2)

  // Executive Summary
  if (options.includeSections.executiveSummary) {
    doc.fontSize(18).fillColor('#1E3A5F').text('Executive Summary')
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#1E3A5F')
    doc.moveDown(0.5)

    const critCount = data.vulnerabilities.filter(v => v.severity === 'critical').length
    const highCount = data.vulnerabilities.filter(v => v.severity === 'high').length

    doc
      .fontSize(11)
      .fillColor('#374151')
      .text(
        data.aiSummary ??
          `This security assessment of ${data.session.target ?? 'the target network'} identified ${data.devices.length} active hosts ` +
            `and ${data.vulnerabilities.length} vulnerabilities, including ${critCount} critical and ${highCount} high severity findings. ` +
            `Immediate remediation is recommended for all critical and high severity items.`
      )
    doc.moveDown()
  }

  // Device inventory
  if (options.includeSections.deviceInventory && data.devices.length > 0) {
    doc.addPage()
    doc.fontSize(18).fillColor('#1E3A5F').text('Device Inventory')
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#1E3A5F')
    doc.moveDown(0.5)

    for (const device of data.devices) {
      doc
        .fontSize(12)
        .fillColor('#111827')
        .text(`${device.ip}  ${device.hostname ? `(${device.hostname})` : ''}`, {
          continued: false,
        })
      doc
        .fontSize(10)
        .fillColor('#6B7280')
        .text(
          `  Type: ${device.deviceType}  |  MAC: ${device.mac ?? 'N/A'}  |  Vendor: ${device.vendor ?? 'N/A'}  |  Status: ${device.status}`
        )
      if (device.ports && device.ports.length > 0) {
        const openPorts = device.ports
          .filter(p => p.state === 'open')
          .map(p => `${p.port}/${p.protocol}`)
          .join(', ')
        doc.fontSize(10).fillColor('#374151').text(`  Open ports: ${openPorts}`)
      }
      doc.moveDown(0.5)
    }
  }

  // Vulnerabilities
  if (options.includeSections.vulnerabilities && data.vulnerabilities.length > 0) {
    doc.addPage()
    doc.fontSize(18).fillColor('#1E3A5F').text('Vulnerabilities')
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#1E3A5F')
    doc.moveDown(0.5)

    const sorted = [...data.vulnerabilities].sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
      return (order[a.severity] ?? 5) - (order[b.severity] ?? 5)
    })

    for (const vuln of sorted) {
      doc
        .fontSize(12)
        .fillColor(severityColor(vuln.severity))
        .text(`[${vuln.severity.toUpperCase()}] ${vuln.title}`)
      if (vuln.cveId) {
        doc
          .fontSize(10)
          .fillColor('#6B7280')
          .text(`CVE: ${vuln.cveId}  |  CVSS: ${vuln.cvss?.score ?? 'N/A'}`)
      }
      doc
        .fontSize(10)
        .fillColor('#374151')
        .text(vuln.description ?? '', { indent: 10 })
      if (vuln.solution) {
        doc.fontSize(10).fillColor('#065F46').text(`Fix: ${vuln.solution}`, { indent: 10 })
      }
      doc.moveDown(0.5)
    }
  }

  // Traffic Analysis
  if (options.includeSections.trafficAnalysis) {
    doc.addPage()
    doc.fontSize(18).fillColor('#1E3A5F').text('Traffic Analysis')
    doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke('#1E3A5F')
    doc.moveDown(0.5)
    doc
      .fontSize(11)
      .fillColor('#374151')
      .text(`Total packets captured: ${data.packets.length}`)
      .text(`Credentials detected: ${data.credentials.length}`)
      .text(`Security alerts: ${data.alerts.length}`)

    if (data.credentials.length > 0) {
      doc.moveDown().fontSize(14).fillColor('#DC2626').text('Captured Credentials')
      for (const cred of data.credentials.slice(0, 20)) {
        doc
          .fontSize(10)
          .fillColor('#374151')
          .text(
            `${cred.protocol} | ${cred.srcIp} -> ${cred.dstIp}:${cred.port} | user: ${cred.username ?? 'N/A'} | pass: ${cred.password ? '[REDACTED]' : 'N/A'}`
          )
      }
    }
  }

  doc.end()

  return new Promise((resolve, reject) => {
    stream.on('finish', () => resolve(outPath))
    stream.on('error', reject)
  })
}

// ---------------------------------------------------------------------------
// DOCX generation
// ---------------------------------------------------------------------------

async function generateDocx(options: ReportOptions, data: ReportData): Promise<string> {
  const outPath = outputPath(options)
  const title = options.title ?? 'Network Security Assessment Report'

  const children: (Paragraph | Table)[] = [
    new Paragraph({ text: title, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER }),
    new Paragraph({ text: '' }),
  ]

  if (options.companyName) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new TextRun({ text: options.companyName, size: 32 })],
      })
    )
  }

  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: `Date: ${new Date().toLocaleDateString()}`, color: '6B7280' }),
      ],
    }),
    new Paragraph({ text: '' })
  )

  if (options.includeSections.executiveSummary) {
    children.push(
      new Paragraph({ text: 'Executive Summary', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({
        children: [
          new TextRun({
            text:
              data.aiSummary ??
              `This assessment identified ${data.devices.length} active hosts and ${data.vulnerabilities.length} vulnerabilities.`,
          }),
        ],
      }),
      new Paragraph({ text: '' })
    )
  }

  if (options.includeSections.deviceInventory && data.devices.length > 0) {
    children.push(new Paragraph({ text: 'Device Inventory', heading: HeadingLevel.HEADING_1 }))
    const rows = [
      new TableRow({
        children: ['IP Address', 'Hostname', 'Type', 'MAC', 'Status'].map(
          t =>
            new TableCell({
              children: [new Paragraph({ children: [new TextRun({ text: t, bold: true })] })],
              width: { size: 20, type: WidthType.PERCENTAGE },
            })
        ),
        tableHeader: true,
      }),
      ...data.devices.map(
        d =>
          new TableRow({
            children: [d.ip, d.hostname ?? '', d.deviceType, d.mac ?? '', d.status].map(
              t =>
                new TableCell({
                  children: [new Paragraph(t)],
                  width: { size: 20, type: WidthType.PERCENTAGE },
                })
            ),
          })
      ),
    ]
    children.push(
      new Table({
        rows,
        width: { size: 100, type: WidthType.PERCENTAGE },
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
          insideHorizontal: { style: BorderStyle.SINGLE, size: 1 },
          insideVertical: { style: BorderStyle.SINGLE, size: 1 },
        },
      }),
      new Paragraph({ text: '' })
    )
  }

  if (options.includeSections.vulnerabilities && data.vulnerabilities.length > 0) {
    children.push(new Paragraph({ text: 'Vulnerabilities', heading: HeadingLevel.HEADING_1 }))
    const sorted = [...data.vulnerabilities].sort((a, b) => {
      const o = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
      return (o[a.severity] ?? 5) - (o[b.severity] ?? 5)
    })
    for (const v of sorted) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[${v.severity.toUpperCase()}] ${v.title}`,
              bold: true,
              color: severityColor(v.severity).replace('#', ''),
            }),
          ],
        }),
        new Paragraph({ children: [new TextRun({ text: v.description ?? '', size: 20 })] }),
        v.solution
          ? new Paragraph({
              children: [
                new TextRun({ text: `Remediation: ${v.solution}`, italics: true, color: '065F46' }),
              ],
            })
          : new Paragraph({ text: '' }),
        new Paragraph({ text: '' })
      )
    }
  }

  const doc = new Document({
    sections: [{ properties: {}, children }],
    creator: options.authorName ?? 'Black Network',
    title,
  })

  const buffer = await Packer.toBuffer(doc)
  const { writeFile } = await import('fs/promises')
  await writeFile(outPath, buffer)
  return outPath
}

// ---------------------------------------------------------------------------
// Public service
// ---------------------------------------------------------------------------

class ReportService {
  async generate(options: ReportOptions, data: ReportData): Promise<ReportResult> {
    try {
      logger.info(`[report] generating ${options.format} report for session ${options.sessionId}`)
      const outPath =
        options.format === 'pdf'
          ? await generatePdf(options, data)
          : await generateDocx(options, data)

      const { statSync } = await import('fs')
      const size = statSync(outPath).size
      logger.info(`[report] saved to ${outPath} (${size} bytes)`)
      return { success: true, path: outPath, size }
    } catch (err) {
      logger.error(`[report] generation failed: ${err}`)
      return { success: false, error: String(err) }
    }
  }
}

export const reportService = new ReportService()
