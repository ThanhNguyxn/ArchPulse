/**
 * Main analyzer module
 * @module analyzers
 */

import * as fs from 'fs';
import {
    ArchitectureAnalysis,
    ArchitectureMetrics,
    ArchPulseConfig,
    ParsedFile,
} from '../types';
import { loadConfig, DEFAULT_CONFIG } from '../config/loader';
import { parseFile } from '../parsers';
import { scanWithConfig, ScanResult, readFileContent } from './scanner';
import {
    buildDependencyGraph,
    getHighCouplingModules,
    getOrphanModules,
    getEntryPoints,
    calculateGraphStats,
} from './graph';
import { detectLayers, inferLayerHierarchy } from './layers';
import { debug, info, step, bullet, warn, createSpinner } from '../utils/logger';

/**
 * Options for the analyzer
 */
export interface AnalyzeOptions {
    /** Project root directory */
    projectRoot: string;
    /** Optional config file path */
    configPath?: string;
    /** Show verbose output */
    verbose?: boolean;
}

/**
 * Analyze a codebase and extract its architecture
 */
export async function analyze(options: AnalyzeOptions): Promise<ArchitectureAnalysis> {
    const { projectRoot, configPath, verbose } = options;
    const startTime = Date.now();

    debug(`Analyzing project: ${projectRoot}`);

    // Step 1: Load configuration
    step(1, 5, 'Loading configuration...');
    const config = loadConfig(projectRoot, configPath);

    // Step 2: Scan for files
    step(2, 5, 'Scanning for source files...');
    const scanResult = await scanWithConfig(projectRoot, config);

    if (scanResult.totalFiles === 0) {
        warn('No source files found. Check your configuration.');
        return createEmptyAnalysis(projectRoot);
    }

    bullet(`Found ${scanResult.totalFiles} files in ${scanResult.duration}ms`);

    // Step 3: Parse files
    step(3, 5, 'Parsing source files...');
    const parsedFiles = await parseFiles(scanResult.files, projectRoot, verbose);

    bullet(`Parsed ${parsedFiles.length} files`);

    // Step 4: Build dependency graph
    step(4, 5, 'Building dependency graph...');
    const graph = buildDependencyGraph(parsedFiles, projectRoot);

    const stats = calculateGraphStats(graph);
    bullet(`${stats.totalNodes} modules, ${stats.totalEdges} dependencies`);

    if (stats.circularCount > 0) {
        warn(`Found ${stats.circularCount} circular dependencies`);
    }

    // Step 5: Detect layers
    step(5, 5, 'Detecting architecture layers...');
    let layers = detectLayers(graph, config);
    layers = inferLayerHierarchy(layers, graph);

    bullet(`Detected ${layers.length} layers`);

    // Calculate metrics
    const metrics = calculateMetrics(graph, parsedFiles);

    const duration = Date.now() - startTime;
    debug(`Analysis completed in ${duration}ms`);

    return {
        projectRoot,
        graph,
        layers,
        timestamp: new Date(),
        filesAnalyzed: parsedFiles.length,
        totalDependencies: stats.totalEdges,
        metrics,
    };
}

/**
 * Parse all files and extract imports
 */
async function parseFiles(
    files: string[],
    projectRoot: string,
    verbose?: boolean
): Promise<ParsedFile[]> {
    const parsedFiles: ParsedFile[] = [];
    let errorCount = 0;

    for (const filePath of files) {
        const content = await readFileContent(filePath);

        if (content === null) {
            errorCount++;
            continue;
        }

        const parsed = parseFile(content, filePath, projectRoot);

        if (parsed) {
            parsedFiles.push(parsed);

            if (parsed.errors.length > 0 && verbose) {
                for (const err of parsed.errors) {
                    warn(`${parsed.relativePath}: ${err}`);
                }
            }
        }
    }

    if (errorCount > 0) {
        debug(`Failed to read ${errorCount} files`);
    }

    return parsedFiles;
}

/**
 * Calculate architecture metrics
 */
function calculateMetrics(
    graph: ReturnType<typeof buildDependencyGraph>,
    parsedFiles: ParsedFile[]
): ArchitectureMetrics {
    const highCouplingModules = getHighCouplingModules(graph);
    const orphanModules = getOrphanModules(graph);
    const entryPoints = getEntryPoints(graph);

    // Calculate average coupling
    let totalCoupling = 0;
    for (const node of graph.nodes.values()) {
        totalCoupling += node.coupling;
    }
    const averageCoupling = graph.nodes.size > 0
        ? totalCoupling / graph.nodes.size
        : 0;

    return {
        averageCoupling: Math.round(averageCoupling * 100) / 100,
        highCouplingModules,
        circularDependencyCount: graph.circularDependencies.length,
        orphanModules,
        entryPointsCount: entryPoints.length,
    };
}

/**
 * Create an empty analysis result
 */
function createEmptyAnalysis(projectRoot: string): ArchitectureAnalysis {
    return {
        projectRoot,
        graph: {
            nodes: new Map(),
            edges: [],
            externalDependencies: new Set(),
            circularDependencies: [],
        },
        layers: [],
        timestamp: new Date(),
        filesAnalyzed: 0,
        totalDependencies: 0,
        metrics: {
            averageCoupling: 0,
            highCouplingModules: [],
            circularDependencyCount: 0,
            orphanModules: [],
            entryPointsCount: 0,
        },
    };
}

/**
 * Get a summary of the analysis
 */
export function getAnalysisSummary(analysis: ArchitectureAnalysis): string {
    const lines: string[] = [
        `📊 Architecture Analysis Summary`,
        ``,
        `Files analyzed: ${analysis.filesAnalyzed}`,
        `Total dependencies: ${analysis.totalDependencies}`,
        `Layers detected: ${analysis.layers.length}`,
        ``,
        `Health Metrics:`,
        `  • Average coupling: ${analysis.metrics.averageCoupling}`,
        `  • Entry points: ${analysis.metrics.entryPointsCount}`,
        `  • Circular dependencies: ${analysis.metrics.circularDependencyCount}`,
        `  • High coupling modules: ${analysis.metrics.highCouplingModules.length}`,
        `  • Orphan modules: ${analysis.metrics.orphanModules.length}`,
    ];

    if (analysis.layers.length > 0) {
        lines.push(``, `Layers:`);
        for (const layer of analysis.layers) {
            lines.push(`  • ${layer.name} (${layer.modules.length} modules)`);
        }
    }

    if (analysis.metrics.circularDependencyCount > 0) {
        lines.push(``, `⚠️ Circular Dependencies:`);
        for (const cycle of analysis.graph.circularDependencies.slice(0, 5)) {
            lines.push(`  • ${cycle.join(' → ')}`);
        }
        if (analysis.graph.circularDependencies.length > 5) {
            lines.push(`  ... and ${analysis.graph.circularDependencies.length - 5} more`);
        }
    }

    return lines.join('\n');
}

// Re-export sub-modules
export * from './scanner';
export * from './graph';
export * from './layers';
