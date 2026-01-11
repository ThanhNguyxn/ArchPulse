/**
 * Hierarchical layout algorithm for diagram elements
 * @module generators/layout
 */

import {
    DiagramNode,
    DiagramEdge,
    Position,
    Size,
    ArchitectureAnalysis,
    ArchitectureLayer,
} from '../types';
import { debug } from '../utils/logger';

/**
 * Layout configuration
 */
export interface LayoutConfig {
    /** Canvas padding */
    padding: number;
    /** Horizontal gap between nodes */
    horizontalGap: number;
    /** Vertical gap between layers */
    verticalGap: number;
    /** Node width */
    nodeWidth: number;
    /** Node height */
    nodeHeight: number;
    /** Layer header height */
    layerHeaderHeight: number;
    /** Layer padding */
    layerPadding: number;
    /** Maximum nodes per row in a layer */
    maxNodesPerRow: number;
}

const DEFAULT_LAYOUT_CONFIG: LayoutConfig = {
    padding: 40,
    horizontalGap: 30,
    verticalGap: 60,
    nodeWidth: 160,
    nodeHeight: 50,
    layerHeaderHeight: 30,
    layerPadding: 20,
    maxNodesPerRow: 6,
};

/**
 * Layout result
 */
export interface LayoutResult {
    nodes: DiagramNode[];
    edges: DiagramEdge[];
    width: number;
    height: number;
    layerBounds: Map<string, { x: number; y: number; width: number; height: number }>;
}

/**
 * Generate layout for architecture analysis
 */
export function generateLayout(
    analysis: ArchitectureAnalysis,
    config: Partial<LayoutConfig> = {}
): LayoutResult {
    const cfg = { ...DEFAULT_LAYOUT_CONFIG, ...config };

    const nodes: DiagramNode[] = [];
    const edges: DiagramEdge[] = [];
    const layerBounds = new Map<string, { x: number; y: number; width: number; height: number }>();

    let currentY = cfg.padding;
    let maxWidth = 0;
    const nodePositions = new Map<string, DiagramNode>();

    // Create layer groups and position nodes
    for (const layer of analysis.layers) {
        const layerResult = layoutLayer(layer, currentY, cfg, analysis);

        // Add layer group node
        const layerNode: DiagramNode = {
            id: `layer-${layer.id}`,
            label: layer.name,
            position: { x: cfg.padding, y: currentY },
            size: layerResult.size,
            fillColor: adjustColorOpacity(layer.color, 0.1),
            strokeColor: layer.color,
            fontColor: '#333333',
            isGroup: true,
            layer: layer.id,
        };
        nodes.push(layerNode);

        // Store layer bounds
        layerBounds.set(layer.id, {
            x: cfg.padding,
            y: currentY,
            width: layerResult.size.width,
            height: layerResult.size.height,
        });

        // Add module nodes
        for (const moduleNode of layerResult.nodes) {
            moduleNode.parentId = layerNode.id;
            nodes.push(moduleNode);
            nodePositions.set(moduleNode.metadata?.path as string, moduleNode);
        }

        maxWidth = Math.max(maxWidth, layerResult.size.width + cfg.padding * 2);
        currentY += layerResult.size.height + cfg.verticalGap;
    }

    // Create edges
    for (const edge of analysis.graph.edges) {
        const sourceNode = nodePositions.get(edge.from);
        const targetNode = nodePositions.get(edge.to);

        if (sourceNode && targetNode) {
            edges.push({
                id: `edge-${edges.length}`,
                sourceId: sourceNode.id,
                targetId: targetNode.id,
                label: edge.weight > 1 ? String(edge.weight) : undefined,
                style: 'solid',
                strokeColor: '#666666',
                strokeWidth: Math.min(1 + Math.log2(edge.weight), 3),
            });
        }
    }

    const totalHeight = currentY + cfg.padding;

    // Normalize layer widths to max width
    for (const node of nodes) {
        if (node.isGroup) {
            node.size.width = maxWidth - cfg.padding * 2;
        }
    }

    debug(`Layout: ${nodes.length} nodes, ${edges.length} edges, ${maxWidth}x${totalHeight}`);

    return {
        nodes,
        edges,
        width: maxWidth,
        height: totalHeight,
        layerBounds,
    };
}

/**
 * Layout nodes within a layer
 */
function layoutLayer(
    layer: ArchitectureLayer,
    startY: number,
    config: LayoutConfig,
    analysis: ArchitectureAnalysis
): { nodes: DiagramNode[]; size: Size } {
    const nodes: DiagramNode[] = [];
    const moduleCount = layer.modules.length;

    if (moduleCount === 0) {
        return {
            nodes: [],
            size: { width: config.nodeWidth + config.layerPadding * 2, height: config.layerHeaderHeight + config.layerPadding * 2 },
        };
    }

    // Calculate grid dimensions
    const nodesPerRow = Math.min(config.maxNodesPerRow, moduleCount);
    const rowCount = Math.ceil(moduleCount / nodesPerRow);

    // Sort modules by number of dependencies (most connected first)
    const sortedModules = [...layer.modules].sort((a, b) => {
        const nodeA = analysis.graph.nodes.get(a);
        const nodeB = analysis.graph.nodes.get(b);
        const scoreA = (nodeA?.inDegree ?? 0) + (nodeA?.outDegree ?? 0);
        const scoreB = (nodeB?.inDegree ?? 0) + (nodeB?.outDegree ?? 0);
        return scoreB - scoreA;
    });

    // Position nodes in a grid
    let nodeIndex = 0;
    const startX = config.padding + config.layerPadding;
    const contentStartY = startY + config.layerHeaderHeight + config.layerPadding;

    for (let row = 0; row < rowCount; row++) {
        const nodesInThisRow = Math.min(nodesPerRow, moduleCount - row * nodesPerRow);

        for (let col = 0; col < nodesInThisRow; col++) {
            if (nodeIndex >= sortedModules.length) break;

            const modulePath = sortedModules[nodeIndex];
            const graphNode = analysis.graph.nodes.get(modulePath);

            const x = startX + col * (config.nodeWidth + config.horizontalGap);
            const y = contentStartY + row * (config.nodeHeight + config.horizontalGap / 2);

            const node: DiagramNode = {
                id: `node-${nodeIndex}`,
                label: graphNode?.name ?? getModuleName(modulePath),
                position: { x, y },
                size: { width: config.nodeWidth, height: config.nodeHeight },
                fillColor: layer.color,
                strokeColor: darkenColor(layer.color, 20),
                fontColor: '#ffffff',
                isGroup: false,
                layer: layer.id,
                metadata: {
                    path: modulePath,
                    inDegree: graphNode?.inDegree ?? 0,
                    outDegree: graphNode?.outDegree ?? 0,
                    coupling: graphNode?.coupling ?? 0,
                },
            };

            nodes.push(node);
            nodeIndex++;
        }
    }

    // Calculate layer size
    const contentWidth = nodesPerRow * config.nodeWidth + (nodesPerRow - 1) * config.horizontalGap;
    const contentHeight = rowCount * config.nodeHeight + (rowCount - 1) * config.horizontalGap / 2;

    const layerWidth = contentWidth + config.layerPadding * 2;
    const layerHeight = config.layerHeaderHeight + contentHeight + config.layerPadding * 2;

    return {
        nodes,
        size: { width: layerWidth, height: layerHeight },
    };
}

/**
 * Get module name from path
 */
function getModuleName(path: string): string {
    const parts = path.replace(/\\/g, '/').split('/');
    const filename = parts[parts.length - 1];
    return filename.replace(/\.[^.]+$/, '');
}

/**
 * Adjust color opacity (for layer backgrounds)
 */
function adjustColorOpacity(hexColor: string, opacity: number): string {
    // For draw.io, we'll just lighten the color instead
    return lightenColor(hexColor, Math.round((1 - opacity) * 100));
}

/**
 * Lighten a hex color
 */
function lightenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);

    let r = (num >> 16) + amt;
    let g = ((num >> 8) & 0x00ff) + amt;
    let b = (num & 0x0000ff) + amt;

    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));

    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Darken a hex color
 */
function darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);

    let r = (num >> 16) - amt;
    let g = ((num >> 8) & 0x00ff) - amt;
    let b = (num & 0x0000ff) - amt;

    r = Math.min(255, Math.max(0, r));
    g = Math.min(255, Math.max(0, g));
    b = Math.min(255, Math.max(0, b));

    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Minimize edge crossings using barycenter heuristic
 * This is a simplified implementation
 */
export function minimizeEdgeCrossings(
    layers: DiagramNode[][],
    edges: DiagramEdge[]
): DiagramNode[][] {
    // Build edge lookup
    const outgoingEdges = new Map<string, string[]>();
    const incomingEdges = new Map<string, string[]>();

    for (const edge of edges) {
        if (!outgoingEdges.has(edge.sourceId)) {
            outgoingEdges.set(edge.sourceId, []);
        }
        outgoingEdges.get(edge.sourceId)!.push(edge.targetId);

        if (!incomingEdges.has(edge.targetId)) {
            incomingEdges.set(edge.targetId, []);
        }
        incomingEdges.get(edge.targetId)!.push(edge.sourceId);
    }

    // Iterate through layers and reorder based on barycenter
    for (let i = 1; i < layers.length; i++) {
        const prevLayer = layers[i - 1];
        const currentLayer = layers[i];

        // Calculate barycenter for each node
        const barycenters = new Map<string, number>();

        for (const node of currentLayer) {
            const incoming = incomingEdges.get(node.id) || [];
            if (incoming.length === 0) {
                barycenters.set(node.id, Infinity);
                continue;
            }

            let sum = 0;
            let count = 0;

            for (const sourceId of incoming) {
                const sourceIndex = prevLayer.findIndex(n => n.id === sourceId);
                if (sourceIndex >= 0) {
                    sum += sourceIndex;
                    count++;
                }
            }

            barycenters.set(node.id, count > 0 ? sum / count : Infinity);
        }

        // Sort by barycenter
        currentLayer.sort((a, b) => {
            const aCenter = barycenters.get(a.id) ?? Infinity;
            const bCenter = barycenters.get(b.id) ?? Infinity;
            return aCenter - bCenter;
        });
    }

    return layers;
}
