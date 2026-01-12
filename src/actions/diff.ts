/**
 * Change detection for architecture diagrams
 * @module actions/diff
 */

import * as fs from 'fs';
import * as path from 'path';
import * as github from '@actions/github';
import * as core from '@actions/core';

type Context = typeof github.context;

/**
 * Detect if the diagram has changed compared to the base branch
 */
export async function detectChanges(diagramPath: string, context: Context): Promise<boolean> {
  try {
    // Check if diagram file exists
    if (!fs.existsSync(diagramPath)) {
      core.debug('Diagram file does not exist yet');
      return true; // New diagram = change
    }

    const currentContent = fs.readFileSync(diagramPath, 'utf-8');

    // Try to get the file from the base branch
    const baseBranch = context.payload.pull_request?.base?.ref;
    if (!baseBranch) {
      core.debug('No base branch found, assuming change');
      return true;
    }

    // Check if there's a cached version from previous runs
    const cacheDir = process.env.RUNNER_TEMP || '/tmp';
    const cachePath = path.join(cacheDir, 'archpulse-previous.drawio');

    if (fs.existsSync(cachePath)) {
      const previousContent = fs.readFileSync(cachePath, 'utf-8');

      // Compare content (ignoring whitespace differences)
      const currentNormalized = normalizeXml(currentContent);
      const previousNormalized = normalizeXml(previousContent);

      const changed = currentNormalized !== previousNormalized;
      core.debug(`Diagram changed: ${changed}`);

      return changed;
    }

    // No previous version found
    core.debug('No previous diagram version found');
    return true;
  } catch (error) {
    core.debug(`Error detecting changes: ${error}`);
    return true; // On error, assume changed
  }
}

/**
 * Normalize XML content for comparison
 * Removes timestamps and other volatile attributes
 */
function normalizeXml(content: string): string {
  return (
    content
      // Remove timestamps
      .replace(/modified="[^"]*"/g, '')
      // Remove whitespace between tags
      .replace(/>\s+</g, '><')
      // Normalize line endings
      .replace(/\r\n/g, '\n')
      .trim()
  );
}

/**
 * Save current diagram as cache for future comparisons
 */
export function cacheCurrentDiagram(diagramPath: string): void {
  try {
    if (!fs.existsSync(diagramPath)) return;

    const cacheDir = process.env.RUNNER_TEMP || '/tmp';
    const cachePath = path.join(cacheDir, 'archpulse-previous.drawio');

    fs.copyFileSync(diagramPath, cachePath);
    core.debug(`Cached diagram to ${cachePath}`);
  } catch (error) {
    core.debug(`Failed to cache diagram: ${error}`);
  }
}

/**
 * Extract node and edge counts from diagram for summary
 */
export function extractDiagramStats(diagramPath: string): { nodes: number; edges: number } | null {
  try {
    if (!fs.existsSync(diagramPath)) return null;

    const content = fs.readFileSync(diagramPath, 'utf-8');

    // Count mxCell elements (rough estimate)
    const nodeMatches = content.match(/<mxCell[^>]*vertex="1"/g);
    const edgeMatches = content.match(/<mxCell[^>]*edge="1"/g);

    return {
      nodes: nodeMatches?.length || 0,
      edges: edgeMatches?.length || 0,
    };
  } catch {
    return null;
  }
}
