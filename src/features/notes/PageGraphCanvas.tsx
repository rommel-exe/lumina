import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

type GraphNode = {
  id: string
  name: string
}

type GraphLink = {
  source: string
  target: string
}

type SimNode = GraphNode & d3.SimulationNodeDatum
type SimLink = d3.SimulationLinkDatum<SimNode>

type PageGraphCanvasProps = {
  nodes: GraphNode[]
  links: GraphLink[]
  selectedPageId: string
  onSelectPage: (pageId: string) => void
}

export const PageGraphCanvas = ({ nodes, links, selectedPageId, onSelectPage }: PageGraphCanvasProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null)

  useEffect(() => {
    if (!svgRef.current) return

    const svgEl = svgRef.current
    const parent = svgEl.parentElement
    const width = parent?.clientWidth ?? 1000
    const height = parent?.clientHeight ?? 700

    const svg = d3.select(svgEl)
    svg.selectAll('*').remove()
    svg.attr('viewBox', `0 0 ${width} ${height}`)

    const graphRoot = svg.append('g')

    const simNodes: SimNode[] = nodes.map((node) => ({ ...node }))
    const simLinks: SimLink[] = links.map((link) => ({ ...link }))

    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force(
        'link',
        d3
          .forceLink<SimNode, SimLink>(simLinks)
          .id((d) => d.id)
          .distance(130),
      )
      .force('charge', d3.forceManyBody().strength(-550))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(36))

    const linksLayer = graphRoot
      .append('g')
      .attr('stroke', '#7d95d4')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(simLinks)
      .join('line')
      .attr('stroke-width', 2)

    const dragBehavior = d3
      .drag<SVGGElement, SimNode>()
      .on('start', (event, d) => {
        event.sourceEvent?.stopPropagation()
        if (!event.active) simulation.alphaTarget(0.2).restart()
        d.fx = d.x
        d.fy = d.y
      })
      .on('drag', (event, d) => {
        d.fx = event.x
        d.fy = event.y
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0)
        d.fx = null
        d.fy = null
      })

    const nodesLayer = graphRoot
      .append('g')
      .selectAll('g')
      .data(simNodes)
      .join('g')
      .attr('cursor', 'pointer')
      .on('click', (_, d) => onSelectPage(d.id))

    nodesLayer
      .append('circle')
      .attr('r', (d) => (d.id === selectedPageId ? 14 : 11))
      .attr('fill', (d) => (d.id === selectedPageId ? '#355fc7' : '#6f8bd8'))

    nodesLayer
      .append('text')
      .text((d) => d.name)
      .attr('font-size', 12)
      .attr('fill', '#3e3b34')
      .attr('dx', 16)
      .attr('dy', 4)
      .style('user-select', 'none')

    // @ts-expect-error D3 drag typing mismatch with selection generic.
    nodesLayer.call(dragBehavior)

    const zoomBehavior = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        graphRoot.attr('transform', event.transform.toString())
      })

    svg.call(zoomBehavior)

    simulation.on('tick', () => {
      linksLayer
        .attr('x1', (d) => (d.source as SimNode).x ?? 0)
        .attr('y1', (d) => (d.source as SimNode).y ?? 0)
        .attr('x2', (d) => (d.target as SimNode).x ?? 0)
        .attr('y2', (d) => (d.target as SimNode).y ?? 0)

      nodesLayer.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    return () => {
      simulation.stop()
    }
  }, [nodes, links, selectedPageId, onSelectPage])

  return <svg ref={svgRef} className="h-full w-full rounded-xl bg-panel" />
}
