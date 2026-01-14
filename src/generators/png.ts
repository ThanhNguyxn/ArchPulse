/**
 * PNG Generator using Playwright to render Mermaid diagrams
 * @module generators/png
 */

import { chromium, Browser } from 'playwright-core';
import * as fs from 'fs';
import * as path from 'path';
import { ArchitectureAnalysis } from '../types';
import { debug, info } from '../utils/logger';

export interface PngOptions {
  /** Output width in pixels */
  width?: number;
  /** Output height in pixels */
  height?: number;
  /** Background color */
  backgroundColor?: string;
  /** Theme: 'default' | 'dark' | 'forest' | 'neutral' */
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
  /** Device scale factor for high DPI */
  scale?: number;
}

const DEFAULT_OPTIONS: Required<PngOptions> = {
  width: 1920,
  height: 1080,
  backgroundColor: '#ffffff',
  theme: 'default',
  scale: 2,
};

/**
 * Generate PNG from Mermaid diagram code
 */
export async function generatePng(
  mermaidCode: string,
  outputPath: string,
  options: PngOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  debug('Launching browser for PNG generation...');

  let browser: Browser | null = null;

  try {
    // Try to find installed browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewportSize({
      width: opts.width,
      height: opts.height,
    });

    // Create HTML with Mermaid
    const html = createMermaidHtml(mermaidCode, opts);
    await page.setContent(html);

    // Wait for Mermaid to render
    await page.waitForSelector('svg.mermaid', { timeout: 10000 });

    // Get the SVG bounding box for proper cropping
    const svgElement = await page.$('svg.mermaid');
    if (!svgElement) {
      throw new Error('Mermaid diagram failed to render');
    }

    const boundingBox = await svgElement.boundingBox();
    if (!boundingBox) {
      throw new Error('Could not determine diagram size');
    }

    // Add padding
    const padding = 40;
    const clip = {
      x: Math.max(0, boundingBox.x - padding),
      y: Math.max(0, boundingBox.y - padding),
      width: boundingBox.width + padding * 2,
      height: boundingBox.height + padding * 2,
    };

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Take screenshot
    await page.screenshot({
      path: outputPath,
      clip,
      type: 'png',
    });

    info(`PNG generated: ${outputPath}`);
    return outputPath;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Generate PNG from analysis (converts to Mermaid first)
 */
export async function generatePngFromAnalysis(
  analysis: ArchitectureAnalysis,
  outputPath: string,
  options: PngOptions = {}
): Promise<string> {
  const mermaidCode = generateMermaidForPng(analysis);
  return generatePng(mermaidCode, outputPath, options);
}

/**
 * Create HTML page with Mermaid diagram
 */
function createMermaidHtml(mermaidCode: string, opts: Required<PngOptions>): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background-color: ${opts.backgroundColor};
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    .mermaid {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    }
  </style>
</head>
<body>
  <pre class="mermaid">
${mermaidCode}
  </pre>
  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: '${opts.theme}',
      flowchart: {
        useMaxWidth: false,
        htmlLabels: true,
        curve: 'basis'
      }
    });
  </script>
</body>
</html>
`;
}

/**
 * Generate Mermaid diagram code from analysis
 */
function generateMermaidForPng(analysis: ArchitectureAnalysis): string {
  const lines: string[] = ['flowchart TB'];

  // Add subgraphs for layers
  for (const layer of analysis.layers) {
    const layerId = sanitizeMermaidId(layer.id);
    lines.push(`    subgraph ${layerId}["${layer.name}"]`);

    for (const modulePath of layer.modules.slice(0, 20)) {
      const node = analysis.graph.nodes.get(modulePath);
      if (node) {
        const nodeId = sanitizeMermaidId(modulePath);
        lines.push(`        ${nodeId}["${node.name}"]`);
      }
    }

    lines.push('    end');
    lines.push('');
  }

  // Add edges (limit to avoid overcrowding)
  const maxEdges = 50;
  let edgeCount = 0;

  for (const edge of analysis.graph.edges) {
    if (edgeCount >= maxEdges) break;

    const sourceId = sanitizeMermaidId(edge.from);
    const targetId = sanitizeMermaidId(edge.to);
    lines.push(`    ${sourceId} --> ${targetId}`);
    edgeCount++;
  }

  // Add styling
  lines.push('');
  for (const layer of analysis.layers) {
    const layerId = sanitizeMermaidId(layer.id);
    const color = layer.color.replace('#', '');
    lines.push(`    style ${layerId} fill:#${color}20,stroke:#${color}`);
  }

  return lines.join('\n');
}

/**
 * Sanitize string for Mermaid node ID
 */
function sanitizeMermaidId(str: string): string {
  return str
    .replace(/[/\\]/g, '_')
    .replace(/\./g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .replace(/^(\d)/, '_$1');
}

/**
 * Check if Playwright browsers are installed
 */
export async function checkBrowserInstalled(): Promise<boolean> {
  try {
    const browser = await chromium.launch({ headless: true });
    await browser.close();
    return true;
  } catch {
    return false;
  }
}

/**
 * Install Playwright browsers
 */
export function getInstallInstructions(): string {
  return `
To enable PNG export, install Playwright browsers:

  npx playwright install chromium

Or run ArchPulse with --install-browser flag.
`.trim();
}
