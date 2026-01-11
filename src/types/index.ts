/**
 * Core type definitions for ArchPulse
 * @module types
 */

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Grouping rule for organizing modules
 */
export interface GroupingRule {
    /** Glob pattern to match files */
    pattern: string;
    /** Display label for the group */
    label: string;
    /** Optional color override */
    color?: string;
}

/**
 * Output configuration
 */
export interface OutputConfig {
    /** Output directory path */
    directory: string;
    /** Base filename (without extension) */
    filename: string;
    /** Output formats to generate */
    formats: ('drawio' | 'png' | 'svg' | 'mermaid')[];
}

/**
 * Style configuration for diagram elements
 */
export interface StyleConfig {
    frontend: string;
    backend: string;
    database: string;
    external: string;
    shared: string;
    [key: string]: string;
}

/**
 * Main configuration schema for ArchPulse
 */
export interface ArchPulseConfig {
    /** Patterns to ignore when scanning */
    ignore: string[];
    /** Custom grouping rules */
    grouping: GroupingRule[];
    /** Output configuration */
    output: OutputConfig;
    /** Color scheme for different component types */
    styles: StyleConfig;
    /** Supported file extensions to parse */
    extensions: string[];
}

// ============================================================================
// Parser Types
// ============================================================================

/**
 * Type of import statement
 */
export type ImportType =
    | 'es6-default'      // import X from 'Y'
    | 'es6-named'        // import { X } from 'Y'
    | 'es6-namespace'    // import * as X from 'Y'
    | 'commonjs'         // require('Y')
    | 'dynamic'          // import('Y')
    | 're-export'        // export * from 'Y'
    | 'python-import'    // import X
    | 'python-from';     // from X import Y

/**
 * Represents a single import statement
 */
export interface ImportStatement {
    /** The module being imported from */
    source: string;
    /** Type of import */
    type: ImportType;
    /** Specific named imports (if applicable) */
    names?: string[];
    /** Whether this is a relative import */
    isRelative: boolean;
    /** Whether this is an external package */
    isExternal: boolean;
    /** Line number in source file */
    line: number;
}

/**
 * Represents a parsed source file
 */
export interface ParsedFile {
    /** Absolute file path */
    filePath: string;
    /** Relative path from project root */
    relativePath: string;
    /** Programming language */
    language: 'typescript' | 'javascript' | 'python' | 'unknown';
    /** Extracted import statements */
    imports: ImportStatement[];
    /** Exported names (for re-export tracking) */
    exports: string[];
    /** File size in bytes */
    size: number;
    /** Parse errors (if any) */
    errors: string[];
}

// ============================================================================
// Analyzer Types
// ============================================================================

/**
 * Edge in the dependency graph
 */
export interface DependencyEdge {
    /** Source module path */
    from: string;
    /** Target module path */
    to: string;
    /** Number of imports from source to target */
    weight: number;
    /** Types of imports used */
    importTypes: ImportType[];
}

/**
 * Node in the dependency graph
 */
export interface DependencyNode {
    /** Module path (relative to project root) */
    path: string;
    /** Display name */
    name: string;
    /** Assigned layer/group */
    layer?: string;
    /** Number of incoming dependencies */
    inDegree: number;
    /** Number of outgoing dependencies */
    outDegree: number;
    /** Coupling score (higher = more coupled) */
    coupling: number;
    /** Whether this is an entry point */
    isEntryPoint: boolean;
    /** Language of the module */
    language: string;
}

/**
 * Complete dependency graph
 */
export interface DependencyGraph {
    /** All nodes in the graph */
    nodes: Map<string, DependencyNode>;
    /** All edges in the graph */
    edges: DependencyEdge[];
    /** External dependencies */
    externalDependencies: Set<string>;
    /** Detected circular dependencies */
    circularDependencies: string[][];
}

/**
 * Detected architectural layer
 */
export interface ArchitectureLayer {
    /** Layer identifier */
    id: string;
    /** Display name */
    name: string;
    /** Modules in this layer */
    modules: string[];
    /** Layer color */
    color: string;
    /** Vertical position (0 = top) */
    level: number;
}

/**
 * Complete architecture analysis result
 */
export interface ArchitectureAnalysis {
    /** Project root path */
    projectRoot: string;
    /** Dependency graph */
    graph: DependencyGraph;
    /** Detected layers */
    layers: ArchitectureLayer[];
    /** Analysis timestamp */
    timestamp: Date;
    /** Files analyzed count */
    filesAnalyzed: number;
    /** Total dependencies count */
    totalDependencies: number;
    /** Health metrics */
    metrics: ArchitectureMetrics;
}

/**
 * Architecture health metrics
 */
export interface ArchitectureMetrics {
    /** Average coupling score */
    averageCoupling: number;
    /** Modules with high coupling (> threshold) */
    highCouplingModules: string[];
    /** Circular dependency count */
    circularDependencyCount: number;
    /** Modules with no incoming dependencies (potential dead code) */
    orphanModules: string[];
    /** Entry points count */
    entryPointsCount: number;
}

// ============================================================================
// Generator Types
// ============================================================================

/**
 * Position in 2D space
 */
export interface Position {
    x: number;
    y: number;
}

/**
 * Dimensions
 */
export interface Size {
    width: number;
    height: number;
}

/**
 * Node in the diagram
 */
export interface DiagramNode {
    /** Unique identifier */
    id: string;
    /** Display label */
    label: string;
    /** Position on canvas */
    position: Position;
    /** Node dimensions */
    size: Size;
    /** Fill color */
    fillColor: string;
    /** Stroke color */
    strokeColor: string;
    /** Font color */
    fontColor: string;
    /** Parent node ID (for grouping) */
    parentId?: string;
    /** Whether this is a group/container */
    isGroup: boolean;
    /** Layer this node belongs to */
    layer?: string;
    /** Additional metadata */
    metadata?: Record<string, unknown>;
}

/**
 * Edge/arrow in the diagram
 */
export interface DiagramEdge {
    /** Unique identifier */
    id: string;
    /** Source node ID */
    sourceId: string;
    /** Target node ID */
    targetId: string;
    /** Edge label (e.g., import count) */
    label?: string;
    /** Line style */
    style: 'solid' | 'dashed' | 'dotted';
    /** Arrow color */
    strokeColor: string;
    /** Line width */
    strokeWidth: number;
}

/**
 * Complete diagram representation
 */
export interface Diagram {
    /** All nodes */
    nodes: DiagramNode[];
    /** All edges */
    edges: DiagramEdge[];
    /** Canvas width */
    width: number;
    /** Canvas height */
    height: number;
    /** Diagram title */
    title: string;
}

// ============================================================================
// CLI Types
// ============================================================================

/**
 * Options for the generate command
 */
export interface GenerateOptions {
    /** Target directory to analyze */
    path: string;
    /** Output directory */
    output: string;
    /** Config file path */
    config?: string;
    /** Detect changes for PR highlighting */
    detectChanges: boolean;
    /** Watch mode */
    watch: boolean;
    /** Verbose output */
    verbose: boolean;
}

/**
 * Result of the generate command
 */
export interface GenerateResult {
    /** Whether generation succeeded */
    success: boolean;
    /** Path to generated .drawio file */
    drawioPath?: string;
    /** Path to generated .png file */
    pngPath?: string;
    /** Analysis summary */
    analysis?: ArchitectureAnalysis;
    /** Error message if failed */
    error?: string;
    /** Execution time in milliseconds */
    duration: number;
}
