/**
 * Dependency graph builder
 * @module analyzers/graph
 */

import * as path from 'path';
import { DependencyGraph, DependencyNode, DependencyEdge, ParsedFile } from '../types';
import { debug } from '../utils/logger';

/**
 * Options for building the dependency graph
 */
export interface GraphOptions {
  /** Include external dependencies in the graph */
  includeExternal: boolean;
  /** Resolve relative imports to absolute paths */
  resolveRelative: boolean;
}

const defaultOptions: GraphOptions = {
  includeExternal: false,
  resolveRelative: true,
};

/**
 * Build a dependency graph from parsed files
 */
export function buildDependencyGraph(
  parsedFiles: ParsedFile[],
  projectRoot: string,
  options: Partial<GraphOptions> = {}
): DependencyGraph {
  const _opts = { ...defaultOptions, ...options };

  const nodes = new Map<string, DependencyNode>();
  const edges: DependencyEdge[] = [];
  const externalDependencies = new Set<string>();
  const edgeMap = new Map<string, DependencyEdge>();

  // First pass: create nodes for all files
  for (const file of parsedFiles) {
    const nodePath = file.relativePath;

    nodes.set(nodePath, {
      path: nodePath,
      name: getModuleName(nodePath),
      inDegree: 0,
      outDegree: 0,
      coupling: 0,
      isEntryPoint: isEntryPoint(nodePath),
      language: file.language,
    });
  }

  // Create a lookup map for resolving imports
  const filePathMap = new Map<string, string>();
  for (const file of parsedFiles) {
    const normalized = file.relativePath.replace(/\\/g, '/');
    filePathMap.set(normalized, file.relativePath);

    // Also map without extension
    const withoutExt = removeExtension(normalized);
    if (!filePathMap.has(withoutExt)) {
      filePathMap.set(withoutExt, file.relativePath);
    }

    // Map index files to their directory
    if (path.basename(withoutExt).toLowerCase() === 'index') {
      const dir = path.dirname(normalized);
      if (!filePathMap.has(dir)) {
        filePathMap.set(dir, file.relativePath);
      }
    }
  }

  // Second pass: create edges from imports
  for (const file of parsedFiles) {
    const sourcePath = file.relativePath;

    for (const imp of file.imports) {
      if (imp.isExternal) {
        // Track external dependency
        const pkgName = getPackageName(imp.source);
        externalDependencies.add(pkgName);
        continue;
      }

      // Resolve the import to a file path
      const targetPath = resolveImport(imp.source, file.filePath, projectRoot, filePathMap);

      if (!targetPath) {
        debug(`Could not resolve import: ${imp.source} from ${sourcePath}`);
        continue;
      }

      // Create or update edge
      const edgeKey = `${sourcePath}|${targetPath}`;

      if (edgeMap.has(edgeKey)) {
        const edge = edgeMap.get(edgeKey)!;
        edge.weight++;
        if (!edge.importTypes.includes(imp.type)) {
          edge.importTypes.push(imp.type);
        }
      } else {
        const edge: DependencyEdge = {
          from: sourcePath,
          to: targetPath,
          weight: 1,
          importTypes: [imp.type],
        };
        edgeMap.set(edgeKey, edge);
        edges.push(edge);
      }
    }
  }

  // Calculate in-degree and out-degree
  for (const edge of edges) {
    const sourceNode = nodes.get(edge.from);
    const targetNode = nodes.get(edge.to);

    if (sourceNode) {
      sourceNode.outDegree += edge.weight;
    }
    if (targetNode) {
      targetNode.inDegree += edge.weight;
    }
  }

  // Calculate coupling score (in + out degree normalized)
  const maxDegree = Math.max(...Array.from(nodes.values()).map(n => n.inDegree + n.outDegree), 1);

  for (const node of nodes.values()) {
    node.coupling = (node.inDegree + node.outDegree) / maxDegree;
  }

  // Detect circular dependencies
  const circularDependencies = detectCircularDependencies(nodes, edges);

  return {
    nodes,
    edges,
    externalDependencies,
    circularDependencies,
  };
}

/**
 * Get module name from path
 */
function getModuleName(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  const basename = path.basename(normalized);
  const withoutExt = removeExtension(basename);

  // If it's an index file, use the directory name
  if (withoutExt.toLowerCase() === 'index') {
    const dir = path.basename(path.dirname(normalized));
    return dir || withoutExt;
  }

  return withoutExt;
}

/**
 * Remove file extension
 */
function removeExtension(filePath: string): string {
  return filePath.replace(/\.[^.]+$/, '');
}

/**
 * Check if file is likely an entry point
 */
function isEntryPoint(filePath: string): boolean {
  const normalized = filePath.toLowerCase().replace(/\\/g, '/');
  const basename = path.basename(normalized);
  const name = removeExtension(basename);

  const entryNames = ['index', 'main', 'app', 'server', 'cli', 'entry'];
  return entryNames.includes(name);
}

/**
 * Get package name from import source
 */
function getPackageName(source: string): string {
  // @scope/package -> @scope/package
  // @scope/package/subpath -> @scope/package
  if (source.startsWith('@')) {
    const parts = source.split('/');
    return parts.slice(0, 2).join('/');
  }

  // package/subpath -> package
  return source.split('/')[0];
}

/**
 * Resolve an import source to a file path
 */
function resolveImport(
  source: string,
  fromFile: string,
  projectRoot: string,
  filePathMap: Map<string, string>
): string | null {
  const fromDir = path.dirname(fromFile);

  // Resolve relative path
  let resolved: string;
  if (source.startsWith('.')) {
    resolved = path.join(fromDir, source).replace(/\\/g, '/');

    // Make relative to project root
    const normalizedRoot = projectRoot.replace(/\\/g, '/');
    if (resolved.startsWith(normalizedRoot)) {
      resolved = resolved.slice(normalizedRoot.length + 1);
    }
  } else {
    // Absolute import (from project root)
    resolved = source;
  }

  // Normalize
  resolved = resolved.replace(/\\/g, '/');

  // Try exact match
  if (filePathMap.has(resolved)) {
    return filePathMap.get(resolved)!;
  }

  // Try without extension
  const withoutExt = removeExtension(resolved);
  if (filePathMap.has(withoutExt)) {
    return filePathMap.get(withoutExt)!;
  }

  // Try with common extensions
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.py'];
  for (const ext of extensions) {
    if (filePathMap.has(resolved + ext)) {
      return filePathMap.get(resolved + ext)!;
    }
  }

  // Try as directory with index file
  const indexPaths = [`${resolved}/index`, `${resolved}/index.ts`, `${resolved}/index.js`];
  for (const indexPath of indexPaths) {
    if (filePathMap.has(indexPath)) {
      return filePathMap.get(indexPath)!;
    }
  }

  return null;
}

/**
 * Detect circular dependencies using DFS
 */
function detectCircularDependencies(
  nodes: Map<string, DependencyNode>,
  edges: DependencyEdge[]
): string[][] {
  const cycles: string[][] = [];
  const adjacency = new Map<string, string[]>();

  // Build adjacency list
  for (const node of nodes.keys()) {
    adjacency.set(node, []);
  }
  for (const edge of edges) {
    adjacency.get(edge.from)?.push(edge.to);
  }

  // DFS for cycle detection
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  function dfs(node: string): boolean {
    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    for (const neighbor of adjacency.get(node) || []) {
      if (!visited.has(neighbor)) {
        if (dfs(neighbor)) {
          return true;
        }
      } else if (recursionStack.has(neighbor)) {
        // Found a cycle
        const cycleStart = path.indexOf(neighbor);
        const cycle = path.slice(cycleStart);
        cycle.push(neighbor); // Complete the cycle
        cycles.push(cycle);
      }
    }

    path.pop();
    recursionStack.delete(node);
    return false;
  }

  for (const node of nodes.keys()) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }

  return cycles;
}

/**
 * Get high coupling modules (above threshold)
 */
export function getHighCouplingModules(graph: DependencyGraph, threshold = 0.7): string[] {
  return Array.from(graph.nodes.entries())
    .filter(([_, node]) => node.coupling > threshold)
    .map(([path, _]) => path);
}

/**
 * Get orphan modules (no incoming dependencies)
 */
export function getOrphanModules(graph: DependencyGraph): string[] {
  return Array.from(graph.nodes.entries())
    .filter(([_, node]) => node.inDegree === 0 && !node.isEntryPoint)
    .map(([path, _]) => path);
}

/**
 * Get entry point modules
 */
export function getEntryPoints(graph: DependencyGraph): string[] {
  return Array.from(graph.nodes.entries())
    .filter(([_, node]) => node.isEntryPoint)
    .map(([path, _]) => path);
}

/**
 * Calculate graph statistics
 */
export function calculateGraphStats(graph: DependencyGraph): {
  totalNodes: number;
  totalEdges: number;
  averageDegree: number;
  density: number;
  circularCount: number;
} {
  const totalNodes = graph.nodes.size;
  const totalEdges = graph.edges.length;
  const avgDegree =
    totalNodes > 0 ? graph.edges.reduce((sum, e) => sum + e.weight, 0) / totalNodes : 0;
  const maxEdges = totalNodes * (totalNodes - 1);
  const density = maxEdges > 0 ? totalEdges / maxEdges : 0;

  return {
    totalNodes,
    totalEdges,
    averageDegree: Math.round(avgDegree * 100) / 100,
    density: Math.round(density * 1000) / 1000,
    circularCount: graph.circularDependencies.length,
  };
}
