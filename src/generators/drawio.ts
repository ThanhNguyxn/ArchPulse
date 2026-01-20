/**
 * Draw.io (mxGraph) XML generator
 * @module generators/drawio
 */

import { DiagramNode, DiagramEdge, Diagram, ArchitectureAnalysis } from '../types';
import { generateLayout } from './layout';
// import { debug } from '../utils/logger'; // Unused for now

/**
 * Options for Draw.io generation
 */
export interface DrawioOptions {
  /** Diagram title */
  title: string;
  /** Include grid in diagram */
  showGrid: boolean;
  /** Page format */
  pageFormat: 'A4' | 'A3' | 'Letter' | 'Auto';
  /** Connection style */
  edgeStyle: 'orthogonal' | 'curved' | 'straight';
}

const DEFAULT_OPTIONS: DrawioOptions = {
  title: 'Architecture Diagram',
  showGrid: true,
  pageFormat: 'Auto',
  edgeStyle: 'curved',
};

/**
 * Generate Draw.io XML from architecture analysis
 */
export function generateDrawioXml(
  analysis: ArchitectureAnalysis,
  options: Partial<DrawioOptions> = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Generate layout
  const layout = generateLayout(analysis);

  // Create diagram
  const diagram: Diagram = {
    nodes: layout.nodes,
    edges: layout.edges,
    width: layout.width,
    height: layout.height,
    title: opts.title,
  };

  return createDrawioXml(diagram, opts);
}

/**
 * Create the complete Draw.io XML document
 */
function createDrawioXml(diagram: Diagram, options: DrawioOptions): string {
  const { width, height, title, nodes, edges } = diagram;

  // Build cells XML
  const cellsXml = [
    // Root cells (required by mxGraph)
    '          <mxCell id="0" />',
    '          <mxCell id="1" parent="0" />',
  ];

  // Add group/layer nodes first
  const groupNodes = nodes.filter(n => n.isGroup);
  const moduleNodes = nodes.filter(n => !n.isGroup);

  for (const node of groupNodes) {
    cellsXml.push(createGroupCellXml(node));
  }

  // Add module nodes
  for (const node of moduleNodes) {
    cellsXml.push(createNodeCellXml(node));
  }

  // Add edges
  for (const edge of edges) {
    cellsXml.push(createEdgeCellXml(edge, options));
  }

  // Calculate page dimensions
  const pageWidth = Math.max(width + 100, 850);
  const pageHeight = Math.max(height + 100, 1100);

  // Create full XML document
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<mxfile host="app.diagrams.net" modified="${new Date().toISOString()}" agent="ArchPulse" version="1.0">
  <diagram id="architecture" name="${escapeXml(title)}">
    <mxGraphModel dx="0" dy="0" grid="${options.showGrid ? '1' : '0'}" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${pageWidth}" pageHeight="${pageHeight}" math="0" shadow="0">
      <root>
${cellsXml.join('\n')}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;

  return xml;
}

/**
 * Create XML for a group/layer cell
 */
function createGroupCellXml(node: DiagramNode): string {
  const { id, label, position, size, fillColor, strokeColor, fontColor } = node;

  const style = [
    'swimlane',
    'horizontal=1',
    'startSize=30',
    `fillColor=${fillColor}`,
    `strokeColor=${strokeColor}`,
    `fontColor=${fontColor}`,
    'fontStyle=1',
    'fontSize=14',
    'rounded=1',
    'arcSize=5',
    'swimlaneFillColor=#ffffff',
  ].join(';');

  return `          <mxCell id="${escapeXml(id)}" value="${escapeXml(label)}" style="${style}" vertex="1" parent="1">
            <mxGeometry x="${position.x}" y="${position.y}" width="${size.width}" height="${size.height}" as="geometry" />
          </mxCell>`;
}

/**
 * Create XML for a module node cell
 */
function createNodeCellXml(node: DiagramNode): string {
  const { id, label, position, size, fillColor, strokeColor, fontColor, parentId, metadata } = node;

  // Determine style based on coupling
  const coupling = (metadata?.coupling as number) ?? 0;
  const strokeWidth = coupling > 0.7 ? 3 : coupling > 0.4 ? 2 : 1;

  const style = [
    'rounded=1',
    'whiteSpace=wrap',
    'html=1',
    `fillColor=${fillColor}`,
    `strokeColor=${strokeColor}`,
    `strokeWidth=${strokeWidth}`,
    `fontColor=${fontColor}`,
    'fontSize=12',
    'fontStyle=0',
    'arcSize=10',
    'shadow=1',
  ].join(';');

  const parent = parentId ? escapeXml(parentId) : '1';

  // Create tooltip with metadata (reserved for future tooltip attribute support)
  let _tooltip = label;
  if (metadata) {
    const inDegree = metadata.inDegree as number;
    const outDegree = metadata.outDegree as number;
    _tooltip = `${label}\n↓ ${inDegree} incoming\n↑ ${outDegree} outgoing`;
  }
  void _tooltip; // Will be used when Draw.io tooltip support is added

  return `          <mxCell id="${escapeXml(id)}" value="${escapeXml(label)}" style="${style}" vertex="1" parent="${parent}">
            <mxGeometry x="${position.x}" y="${position.y}" width="${size.width}" height="${size.height}" as="geometry" />
          </mxCell>`;
}

/**
 * Create XML for an edge cell
 */
function createEdgeCellXml(edge: DiagramEdge, options: DrawioOptions): string {
  const { id, sourceId, targetId, label, strokeColor, strokeWidth } = edge;

  // Edge style based on options
  let edgeStyle: string;
  switch (options.edgeStyle) {
    case 'curved':
      edgeStyle = 'edgeStyle=elbowEdgeStyle;elbow=vertical;curved=1;rounded=1';
      break;
    case 'straight':
      edgeStyle = 'edgeStyle=none';
      break;
    case 'orthogonal':
    default:
      edgeStyle = 'edgeStyle=orthogonalEdgeStyle;rounded=1;curved=1';
  }

  const style = [
    edgeStyle,
    'orthogonalLoop=1',
    'jettySize=auto',
    'html=1',
    `strokeColor=${strokeColor}`,
    `strokeWidth=${strokeWidth}`,
    'endArrow=block',
    'endFill=1',
    'fontSize=10',
    'fontColor=#666666',
  ].join(';');

  const labelValue = label ? escapeXml(label) : '';

  return `          <mxCell id="${escapeXml(id)}" value="${labelValue}" style="${style}" edge="1" parent="1" source="${escapeXml(sourceId)}" target="${escapeXml(targetId)}">
            <mxGeometry relative="1" as="geometry" />
          </mxCell>`;
}

/**
 * Escape special XML characters
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Create a simple diagram from nodes and edges directly
 */
export function createSimpleDrawioXml(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  title = 'Diagram'
): string {
  // Calculate bounds
  let maxX = 0;
  let maxY = 0;
  for (const node of nodes) {
    maxX = Math.max(maxX, node.position.x + node.size.width);
    maxY = Math.max(maxY, node.position.y + node.size.height);
  }

  const diagram: Diagram = {
    nodes,
    edges,
    width: maxX + 100,
    height: maxY + 100,
    title,
  };

  return createDrawioXml(diagram, DEFAULT_OPTIONS);
}

/**
 * Add change highlighting to a diagram
 */
export function addChangeHighlighting(
  xml: string,
  addedNodes: string[],
  removedNodes: string[],
  modifiedNodes: string[]
): string {
  // This would modify the XML to add visual indicators
  // Green for added, red for removed, yellow for modified

  let result = xml;

  // Add green highlight to new nodes
  for (const nodeId of addedNodes) {
    result = result.replace(
      new RegExp(`id="${escapeXml(nodeId)}"([^>]*?)strokeColor=[^;]+`),
      `id="${escapeXml(nodeId)}"$1strokeColor=#27ae60`
    );
  }

  // Add yellow highlight to modified nodes
  for (const nodeId of modifiedNodes) {
    result = result.replace(
      new RegExp(`id="${escapeXml(nodeId)}"([^>]*?)strokeColor=[^;]+`),
      `id="${escapeXml(nodeId)}"$1strokeColor=#f39c12`
    );
  }

  return result;
}

/**
 * Parse Draw.io XML to extract node and edge information
 * Useful for diff comparison
 */
export function parseDrawioXml(xml: string): Diagram {
  // Simple regex-based parsing (for comparison purposes)
  const nodes: DiagramNode[] = [];
  const edges: DiagramEdge[] = [];

  // Extract cells
  const cellRegex = /<mxCell id="([^"]+)"[^>]*value="([^"]*)"[^>]*>/g;
  let match;

  while ((match = cellRegex.exec(xml)) !== null) {
    const id = match[1];
    const label = match[2];

    if (match[0].includes('edge="1"')) {
      // It's an edge
      const sourceMatch = match[0].match(/source="([^"]+)"/);
      const targetMatch = match[0].match(/target="([^"]+)"/);

      if (sourceMatch && targetMatch) {
        edges.push({
          id,
          sourceId: sourceMatch[1],
          targetId: targetMatch[1],
          label: label || undefined,
          style: 'solid',
          strokeColor: '#666666',
          strokeWidth: 1,
        });
      }
    } else if (match[0].includes('vertex="1"')) {
      // It's a node
      const geoMatch = match[0].match(
        /x="([\d.]+)"[^>]*y="([\d.]+)"[^>]*width="([\d.]+)"[^>]*height="([\d.]+)"/
      );

      nodes.push({
        id,
        label: label.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
        position: {
          x: geoMatch ? parseFloat(geoMatch[1]) : 0,
          y: geoMatch ? parseFloat(geoMatch[2]) : 0,
        },
        size: {
          width: geoMatch ? parseFloat(geoMatch[3]) : 100,
          height: geoMatch ? parseFloat(geoMatch[4]) : 50,
        },
        fillColor: '#ffffff',
        strokeColor: '#000000',
        fontColor: '#000000',
        isGroup: match[0].includes('swimlane'),
      });
    }
  }

  return {
    nodes,
    edges,
    width: 800,
    height: 600,
    title: 'Parsed Diagram',
  };
}
