/**
 * SVG Generator using Playwright to render Mermaid diagrams
 * @module generators/svg
 */

import { chromium, Browser } from 'playwright-core';
import * as fs from 'fs';
import * as path from 'path';
import { ArchitectureAnalysis } from '../types';
import { debug, info } from '../utils/logger';

export interface SvgOptions {
  /** Background color (transparent if not specified) */
  backgroundColor?: string;
  /** Theme: 'default' | 'dark' | 'forest' | 'neutral' */
  theme?: 'default' | 'dark' | 'forest' | 'neutral';
  /** Whether to embed fonts */
  embedFonts?: boolean;
}

const DEFAULT_OPTIONS: Required<SvgOptions> = {
  backgroundColor: 'transparent',
  theme: 'default',
  embedFonts: true,
};

/**
 * Generate SVG from Mermaid diagram code
 */
export async function generateSvg(
  mermaidCode: string,
  outputPath: string,
  options: SvgOptions = {}
): Promise<string> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  debug('Launching browser for SVG generation...');

  let browser: Browser | null = null;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    await page.setViewportSize({
      width: 1920,
      height: 1080,
    });

    // Create HTML with Mermaid
    const html = createMermaidHtml(mermaidCode, opts);
    await page.setContent(html);

    // Wait for Mermaid to render
    await page.waitForSelector('svg.mermaid', { timeout: 10000 });

    // Extract SVG content using evaluate with string
    // Note: code runs in browser context where document/window are available
    const svgContent = await page.evaluate(`
      (function() {
        const svgElement = document.querySelector('svg.mermaid');
        if (!svgElement) {
          throw new Error('SVG not found');
        }

        // Clone the SVG to modify it
        const clonedSvg = svgElement.cloneNode(true);

        // Add XML namespace if not present
        if (!clonedSvg.getAttribute('xmlns')) {
          clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        }

        // Get computed styles for all elements and inline them
        const allElements = clonedSvg.querySelectorAll('*');
        allElements.forEach(function(el) {
          const computedStyle = window.getComputedStyle(el);
          var importantStyles = [
            'fill',
            'stroke',
            'stroke-width',
            'font-family',
            'font-size',
            'font-weight',
          ];

          importantStyles.forEach(function(prop) {
            var value = computedStyle.getPropertyValue(prop);
            if (value && value !== 'none') {
              el.style.setProperty(prop, value);
            }
          });
        });

        return clonedSvg.outerHTML;
      })()
    `) as string;

    // Post-process SVG
    let processedSvg = svgContent;

    // Add background if specified
    if (opts.backgroundColor && opts.backgroundColor !== 'transparent') {
      processedSvg = addSvgBackground(processedSvg, opts.backgroundColor);
    }

    // Add XML declaration
    processedSvg = `<?xml version="1.0" encoding="UTF-8"?>\n${processedSvg}`;

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write SVG file
    await fs.promises.writeFile(outputPath, processedSvg, 'utf-8');

    info(`SVG generated: ${outputPath}`);
    return outputPath;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

/**
 * Generate SVG from analysis (converts to Mermaid first)
 */
export async function generateSvgFromAnalysis(
  analysis: ArchitectureAnalysis,
  outputPath: string,
  options: SvgOptions = {}
): Promise<string> {
  const mermaidCode = generateMermaidForSvg(analysis);
  return generateSvg(mermaidCode, outputPath, options);
}

/**
 * Add background rectangle to SVG
 */
function addSvgBackground(svgContent: string, color: string): string {
  // Find viewBox to get dimensions
  const viewBoxMatch = svgContent.match(/viewBox="([^"]+)"/);
  if (!viewBoxMatch) {
    return svgContent;
  }

  const [, , , width, height] = viewBoxMatch[1].split(' ').map(Number);

  // Insert background rect after opening svg tag
  const bgRect = `<rect width="${width || '100%'}" height="${height || '100%'}" fill="${color}"/>`;
  return svgContent.replace(/(<svg[^>]*>)/, `$1\n  ${bgRect}`);
}

/**
 * Create HTML page with Mermaid diagram
 */
function createMermaidHtml(mermaidCode: string, opts: Required<SvgOptions>): string {
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
      background-color: transparent;
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
function generateMermaidForSvg(analysis: ArchitectureAnalysis): string {
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
