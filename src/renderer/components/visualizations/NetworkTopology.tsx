import React, { useEffect, useRef } from 'react'
import * as d3 from 'd3'

interface DeviceNode extends d3.SimulationNodeDatum {
  id: string
  ip: string
  deviceType?: string
  status: 'up' | 'down'
}

interface Link extends d3.SimulationLinkDatum<DeviceNode> {
  source: string | DeviceNode
  target: string | DeviceNode
}

interface NetworkTopologyProps {
  devices: { id: string; ip: string; deviceType?: string; status: 'up' | 'down' }[]
}

export function NetworkTopology({ devices }: NetworkTopologyProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current || devices.length === 0) return

    const width = containerRef.current.clientWidth
    const height = containerRef.current.clientHeight

    // Create a gateway node if there are devices
    const gatewayIp = devices[0]?.ip.split('.').slice(0, 3).concat('1').join('.') || '192.168.1.1'
    
    // Build nodes
    const nodes: DeviceNode[] = [
      { id: gatewayIp, ip: gatewayIp, deviceType: 'router', status: 'up' },
      ...devices.filter(d => d.ip !== gatewayIp).map(d => ({ ...d }))
    ]

    // Build links (everything connects to gateway for a simple star topology)
    const links: Link[] = nodes
      .filter(n => n.id !== gatewayIp)
      .map(n => ({ source: n.id, target: gatewayIp }))

    // Clear previous SVG
    d3.select(containerRef.current).selectAll('*').remove()

    const svg = d3.select(containerRef.current)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .call(d3.zoom<SVGSVGElement, unknown>().on('zoom', (event) => {
        g.attr('transform', event.transform)
      }))
      .append('g')

    const g = svg

    const simulation = d3.forceSimulation<DeviceNode>(nodes)
      .force('link', d3.forceLink<DeviceNode, Link>(links).id(d => d.id).distance(150))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(50))

    // Draw links
    const link = g.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#1e293b') // border color
      .attr('stroke-width', 2)

    // Draw nodes
    const node = g.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .call(d3.drag<SVGGElement, DeviceNode>()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      )

    // Node circles
    node.append('circle')
      .attr('r', 20)
      .attr('fill', d => d.deviceType === 'router' ? '#0f172a' : '#1e293b') // navy-900 / navy-800
      .attr('stroke', d => d.status === 'up' ? '#14b8a6' : '#64748b') // teal / slate-500
      .attr('stroke-width', 2)

    // Node Labels
    node.append('text')
      .text(d => d.ip)
      .attr('x', 0)
      .attr('y', 35)
      .attr('text-anchor', 'middle')
      .attr('fill', '#f1f5f9') // slate-100
      .attr('font-size', '12px')
      .attr('font-family', 'ui-sans-serif, system-ui')

    simulation.on('tick', () => {
      link
        .attr('x1', d => (d.source as DeviceNode).x!)
        .attr('y1', d => (d.source as DeviceNode).y!)
        .attr('x2', d => (d.target as DeviceNode).x!)
        .attr('y2', d => (d.target as DeviceNode).y!)

      node
        .attr('transform', d => `translate(${d.x},${d.y})`)
    })

    function dragstarted(event: any, d: DeviceNode) {
      if (!event.active) simulation.alphaTarget(0.3).restart()
      d.fx = d.x
      d.fy = d.y
    }

    function dragged(event: any, d: DeviceNode) {
      d.fx = event.x
      d.fy = event.y
    }

    function dragended(event: any, d: DeviceNode) {
      if (!event.active) simulation.alphaTarget(0)
      d.fx = null
      d.fy = null
    }

    return () => {
      simulation.stop()
    }
  }, [devices])

  return (
    <div ref={containerRef} className="w-full h-full min-h-[500px] bg-navy-900/30 rounded-lg border border-border overflow-hidden">
      {devices.length === 0 && (
        <div className="flex items-center justify-center h-full text-navy-300">
          No devices to visualize. Start a scan.
        </div>
      )}
    </div>
  )
}
