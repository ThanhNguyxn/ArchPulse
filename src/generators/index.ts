/**
 * Generator module exports
 * @module generators
 */

import * as fs from 'fs';
import * as path from 'path';
import { ArchitectureAnalysis } from '../types';
import { generateDrawioXml, DrawioOptions } from './drawio';
import { generatePngFromAnalysis, checkBrowserInstalled, getInstallInstructions } from './png';
import { generateSvgFromAnalysis } from './svg';
import { error, file as logFile, warn } from '../utils/logger';

/**
 * Options for generating output files
 */
export interface GeneratorOptions {
  /** Output directory */
  outputDir: string;
  /** Base filename (without extension) */
  filename: string;
  /** Formats to generate */
  formats: ('drawio' | 'png' | 'svg' | 'mermaid')[];
  /** Draw.io options */
  drawioOptions?: Partial<DrawioOptions>;
}

const DEFAULT_OPTIONS: GeneratorOptions = {
  outputDir: 'docs',
  filename: 'architecture',
  formats: ['drawio'],
};

/**
 * Result of generation
 */
export interface GeneratorResult {
  success: boolean;
  files: string[];
  errors: string[];
}

/**
 * Generate architecture diagram files
 */
export async function generate(
  analysis: ArchitectureAnalysis,
  options: Partial<GeneratorOptions> = {}
): Promise<GeneratorResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const result: GeneratorResult = {
    success: true,
    files: [],
    errors: [],
  };

  // Ensure output directory exists
  const outputPath = path.isAbsolute(opts.outputDir)
    ? opts.outputDir
    : path.join(analysis.projectRoot, opts.outputDir);

  try {
    await fs.promises.mkdir(outputPath, { recursive: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    result.errors.push(`Failed to create output directory: ${message}`);
    result.success = false;
    return result;
  }

  // Generate each format
  for (const format of opts.formats) {
    try {
      const filePath = await generateFormat(
        analysis,
        format,
        outputPath,
        opts.filename,
        opts.drawioOptions
      );

      if (filePath) {
        result.files.push(filePath);
        logFile(path.relative(analysis.projectRoot, filePath), format);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(`Failed to generate ${format}: ${message}`);
      result.success = false;
    }
  }

  return result;
}

/**
 * Generate a specific format
 */
async function generateFormat(
  analysis: ArchitectureAnalysis,
  format: string,
  outputPath: string,
  filename: string,
  drawioOptions?: Partial<DrawioOptions>
): Promise<string | null> {
  switch (format) {
    case 'drawio':
      return generateDrawioFile(analysis, outputPath, filename, drawioOptions);

    case 'mermaid':
      return generateMermaidFile(analysis, outputPath, filename);

    case 'png':
      return generatePngFile(analysis, outputPath, filename);

    case 'svg':
      return generateSvgFile(analysis, outputPath, filename);

    default:
      error(`Unknown format: ${format}`);
      return null;
  }
}

/**
 * Generate Draw.io file
 */
async function generateDrawioFile(
  analysis: ArchitectureAnalysis,
  outputPath: string,
  filename: string,
  drawioOptions?: Partial<DrawioOptions>
): Promise<string> {
  const xml = generateDrawioXml(analysis, {
    title: `${filename} - Architecture`,
    ...drawioOptions,
  });

  const filePath = path.join(outputPath, `${filename}.drawio`);
  await fs.promises.writeFile(filePath, xml, 'utf-8');

  return filePath;
}

/**
 * Generate Mermaid format
 */
async function generateMermaidFile(
  analysis: ArchitectureAnalysis,
  outputPath: string,
  filename: string
): Promise<string> {
  const mermaid = generateMermaidDiagram(analysis);
  const filePath = path.join(outputPath, `${filename}.mmd`);
  await fs.promises.writeFile(filePath, mermaid, 'utf-8');

  return filePath;
}

/**
 * Generate PNG format using Playwright
 */
async function generatePngFile(
  analysis: ArchitectureAnalysis,
  outputPath: string,
  filename: string
): Promise<string | null> {
  try {
    const browserInstalled = await checkBrowserInstalled();
    if (!browserInstalled) {
      warn('Playwright browser not installed. Run: npx playwright install chromium');
      warn(getInstallInstructions());
      return null;
    }

    const filePath = path.join(outputPath, `${filename}.png`);
    await generatePngFromAnalysis(analysis, filePath);
    return filePath;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    error(`PNG generation failed: ${message}`);
    return null;
  }
}

/**
 * Generate SVG format using Playwright
 */
async function generateSvgFile(
  analysis: ArchitectureAnalysis,
  outputPath: string,
  filename: string
): Promise<string | null> {
  try {
    const browserInstalled = await checkBrowserInstalled();
    if (!browserInstalled) {
      warn('Playwright browser not installed. Run: npx playwright install chromium');
      warn(getInstallInstructions());
      return null;
    }

    const filePath = path.join(outputPath, `${filename}.svg`);
    await generateSvgFromAnalysis(analysis, filePath);
    return filePath;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    error(`SVG generation failed: ${message}`);
    return null;
  }
}

/**
 * Generate Mermaid diagram syntax
 */
function generateMermaidDiagram(analysis: ArchitectureAnalysis): string {
  const lines: string[] = ['flowchart TB'];

  // Add subgraphs for layers
  for (const layer of analysis.layers) {
    lines.push(`    subgraph ${sanitizeMermaidId(layer.id)}["${layer.name}"]`);

    for (const modulePath of layer.modules) {
      const node = analysis.graph.nodes.get(modulePath);
      if (node) {
        const nodeId = sanitizeMermaidId(modulePath);
        lines.push(`        ${nodeId}["${node.name}"]`);
      }
    }

    lines.push('    end');
    lines.push('');
  }

  // Add edges
  lines.push('');
  for (const edge of analysis.graph.edges) {
    const sourceId = sanitizeMermaidId(edge.from);
    const targetId = sanitizeMermaidId(edge.to);
    const label = edge.weight > 1 ? `|${edge.weight}|` : '';
    lines.push(`    ${sourceId} -->${label} ${targetId}`);
  }

  // Add styling
  lines.push('');
  for (const layer of analysis.layers) {
    const color = layer.color.replace('#', '');
    lines.push(`    style ${sanitizeMermaidId(layer.id)} fill:#${color}20,stroke:#${color}`);
  }

  return lines.join('\n');
}

/**
 * Sanitize a string for use as Mermaid node ID
 */
function sanitizeMermaidId(str: string): string {
  return str
    .replace(/[/\\]/g, '_')
    .replace(/\./g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .replace(/^(\d)/, '_$1');
}

/**
 * Generate markdown with embedded Mermaid diagram
 */
export function generateMarkdownWithDiagram(
  analysis: ArchitectureAnalysis,
  title = 'Architecture Overview'
): string {
  const mermaid = generateMermaidDiagram(analysis);

  const lines = [
    `# ${title}`,
    '',
    `*Generated by ArchPulse on ${analysis.timestamp.toISOString()}*`,
    '',
    '## Architecture Diagram',
    '',
    '```mermaid',
    mermaid,
    '```',
    '',
    '## Layers',
    '',
  ];

  for (const layer of analysis.layers) {
    lines.push(`### ${layer.name}`);
    lines.push('');
    lines.push(`- **Modules**: ${layer.modules.length}`);
    lines.push('- **Color**: ${layer.color}');
    lines.push('');

    // List modules
    for (const modulePath of layer.modules.slice(0, 10)) {
      const node = analysis.graph.nodes.get(modulePath);
      if (node) {
        lines.push(`  - \`${node.name}\` (in: ${node.inDegree}, out: ${node.outDegree})`);
      }
    }

    if (layer.modules.length > 10) {
      lines.push(`  - ... and ${layer.modules.length - 10} more`);
    }

    lines.push('');
  }

  // Add metrics
  lines.push('## Metrics');
  lines.push('');
  lines.push(`- **Files analyzed**: ${analysis.filesAnalyzed}`);
  lines.push(`- **Total dependencies**: ${analysis.totalDependencies}`);
  lines.push(`- **Average coupling**: ${analysis.metrics.averageCoupling}`);
  lines.push(`- **Circular dependencies**: ${analysis.metrics.circularDependencyCount}`);

  if (analysis.metrics.circularDependencyCount > 0) {
    lines.push('');
    lines.push('### Circular Dependencies');
    lines.push('');
    for (const cycle of analysis.graph.circularDependencies.slice(0, 5)) {
      lines.push(`- ${cycle.join(' → ')}`);
    }
  }

  return lines.join('\n');
}

// Re-export sub-modules
export * from './drawio';
export * from './layout';
