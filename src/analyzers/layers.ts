/**
 * Architecture layer detector
 * @module analyzers/layers
 */

import * as path from 'path';
import { ArchitectureLayer, DependencyGraph, ArchPulseConfig, GroupingRule } from '../types';
import { debug } from '../utils/logger';

/**
 * Default layer detection rules
 */
const DEFAULT_LAYER_RULES: LayerRule[] = [
  // Frontend layers
  { pattern: /^(src\/)?(ui|views|pages|components|frontend)/i, layer: 'frontend', level: 0 },
  { pattern: /^(src\/)?app/i, layer: 'frontend', level: 0 },

  // API/Controllers
  { pattern: /^(src\/)?(api|routes|controllers|handlers|endpoints)/i, layer: 'api', level: 1 },

  // Services/Business logic
  { pattern: /^(src\/)?(services|business|logic|core|domain)/i, layer: 'services', level: 2 },

  // Data layer
  {
    pattern: /^(src\/)?(db|database|models|entities|repositories|data)/i,
    layer: 'database',
    level: 3,
  },

  // Shared/Utils
  { pattern: /^(src\/)?(utils|helpers|lib|common|shared)/i, layer: 'shared', level: 4 },

  // CLI
  { pattern: /^(src\/)?cli/i, layer: 'cli', level: 0 },

  // Config
  { pattern: /^(src\/)?config/i, layer: 'config', level: 4 },

  // Types
  { pattern: /^(src\/)?types/i, layer: 'types', level: 4 },
];

/**
 * Default colors for layers
 */
const DEFAULT_LAYER_COLORS: Record<string, string> = {
  frontend: '#3498db',
  api: '#1abc9c',
  services: '#e74c3c',
  database: '#9b59b6',
  shared: '#f39c12',
  cli: '#2ecc71',
  config: '#95a5a6',
  types: '#34495e',
  default: '#bdc3c7',
};

/**
 * Layer detection rule
 */
interface LayerRule {
  pattern: RegExp;
  layer: string;
  level: number;
}

/**
 * Detect layers from the dependency graph
 */
export function detectLayers(graph: DependencyGraph, config: ArchPulseConfig): ArchitectureLayer[] {
  const layerMap = new Map<string, Set<string>>();
  const layerLevels = new Map<string, number>();

  // Combine default rules with custom grouping rules
  const customRules = config.grouping.map(g => groupingToLayerRule(g));
  const allRules = [...customRules, ...DEFAULT_LAYER_RULES];

  // Assign each module to a layer
  for (const [modulePath, node] of graph.nodes) {
    const layer = detectLayerForPath(modulePath, allRules);

    if (!layerMap.has(layer.name)) {
      layerMap.set(layer.name, new Set());
      layerLevels.set(layer.name, layer.level);
    }

    layerMap.get(layer.name)!.add(modulePath);

    // Update node with layer info
    node.layer = layer.name;
  }

  // Convert to ArchitectureLayer array
  const layers: ArchitectureLayer[] = [];

  for (const [layerId, modules] of layerMap) {
    const color = getLayerColor(layerId, config);
    const level = layerLevels.get(layerId) ?? 99;

    layers.push({
      id: layerId,
      name: formatLayerName(layerId),
      modules: Array.from(modules),
      color,
      level,
    });
  }

  // Sort by level
  layers.sort((a, b) => a.level - b.level);

  debug(`Detected ${layers.length} layers`);

  return layers;
}

/**
 * Detect the layer for a given file path
 */
function detectLayerForPath(filePath: string, rules: LayerRule[]): { name: string; level: number } {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();

  for (const rule of rules) {
    if (rule.pattern.test(normalized)) {
      return { name: rule.layer, level: rule.level };
    }
  }

  // Check directory name as fallback
  const dirName = path.dirname(normalized).split('/')[0];
  if (dirName && dirName !== '.') {
    return { name: dirName, level: 99 };
  }

  return { name: 'root', level: 99 };
}

/**
 * Convert a grouping rule to a layer rule
 */
function groupingToLayerRule(grouping: GroupingRule): LayerRule {
  // Convert glob pattern to regex
  const regexPattern = grouping.pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*');

  return {
    pattern: new RegExp(`^${regexPattern}`, 'i'),
    layer: grouping.label.toLowerCase().replace(/\s+/g, '-'),
    level: 0, // Custom rules get highest priority
  };
}

/**
 * Get color for a layer
 */
function getLayerColor(layerId: string, config: ArchPulseConfig): string {
  // Check custom styles first
  const customColor = config.styles[layerId];
  if (customColor) {
    return customColor;
  }

  // Check default colors
  return DEFAULT_LAYER_COLORS[layerId] ?? DEFAULT_LAYER_COLORS.default;
}

/**
 * Format layer ID to display name
 */
function formatLayerName(layerId: string): string {
  return layerId
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Group modules by their parent directory
 */
export function groupByDirectory(graph: DependencyGraph, depth = 1): Map<string, string[]> {
  const groups = new Map<string, string[]>();

  for (const modulePath of graph.nodes.keys()) {
    const normalized = modulePath.replace(/\\/g, '/');
    const parts = normalized.split('/');

    // Get directory at specified depth
    const groupPath = parts.slice(0, Math.min(depth + 1, parts.length - 1)).join('/');
    const groupKey = groupPath || 'root';

    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    groups.get(groupKey)!.push(modulePath);
  }

  return groups;
}

/**
 * Infer layer relationships based on import directions
 */
export function inferLayerHierarchy(
  layers: ArchitectureLayer[],
  graph: DependencyGraph
): ArchitectureLayer[] {
  // Count imports between layers
  const layerImports = new Map<string, Map<string, number>>();

  for (const layer of layers) {
    layerImports.set(layer.id, new Map());
  }

  for (const edge of graph.edges) {
    const sourceNode = graph.nodes.get(edge.from);
    const targetNode = graph.nodes.get(edge.to);

    if (sourceNode?.layer && targetNode?.layer && sourceNode.layer !== targetNode.layer) {
      const fromLayer = sourceNode.layer;
      const toLayer = targetNode.layer;

      const imports = layerImports.get(fromLayer);
      if (imports) {
        imports.set(toLayer, (imports.get(toLayer) || 0) + edge.weight);
      }
    }
  }

  // Assign levels based on import directions
  // Higher level = imports from lower levels (dependencies flow downward)
  const incomingCount = new Map<string, number>();

  for (const [fromLayer, imports] of layerImports) {
    for (const [toLayer, count] of imports) {
      incomingCount.set(toLayer, (incomingCount.get(toLayer) || 0) + count);
    }
  }

  // Sort layers by incoming count (fewer incoming = higher level)
  const sortedLayers = [...layers].sort((a, b) => {
    const aIncoming = incomingCount.get(a.id) || 0;
    const bIncoming = incomingCount.get(b.id) || 0;
    return aIncoming - bIncoming;
  });

  // Reassign levels
  sortedLayers.forEach((layer, index) => {
    layer.level = index;
  });

  return sortedLayers;
}

/**
 * Find the dominant layer for a directory
 */
export function findDominantLayer(
  directory: string,
  layers: ArchitectureLayer[]
): ArchitectureLayer | null {
  const normalized = directory.replace(/\\/g, '/').toLowerCase();

  let bestMatch: ArchitectureLayer | null = null;
  let bestMatchLength = 0;

  for (const layer of layers) {
    for (const module of layer.modules) {
      const moduleDir = path.dirname(module.replace(/\\/g, '/').toLowerCase());

      if (normalized.startsWith(moduleDir) && moduleDir.length > bestMatchLength) {
        bestMatch = layer;
        bestMatchLength = moduleDir.length;
      }
    }
  }

  return bestMatch;
}
