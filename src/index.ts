/**
 * ArchPulse - Living Architecture Diagram Generator
 *
 * Library entry point for programmatic usage
 * @module archpulse
 */

// Export types
export * from './types';

// Export core functions
export { analyze, getAnalysisSummary } from './analyzers';
export { generate, generateDrawioXml, generateMarkdownWithDiagram } from './generators';
export { loadConfig, createSampleConfig, DEFAULT_CONFIG } from './config/loader';
export { parseFile, canParseFile, getSupportedExtensions } from './parsers';

// Export utilities
export { logger, configureLogger } from './utils/logger';

// Convenience function for quick diagram generation
import { analyze } from './analyzers';
import { generate } from './generators';
import { loadConfig } from './config/loader';

/**
 * Generate an architecture diagram from a project directory
 *
 * @example
 * ```typescript
 * import { generateDiagram } from 'archpulse';
 *
 * const result = await generateDiagram('./my-project', {
 *   output: 'docs',
 *   formats: ['drawio', 'mermaid'],
 * });
 *
 * console.log('Generated:', result.files);
 * ```
 */
export async function generateDiagram(
  projectPath: string,
  options: {
    output?: string;
    config?: string;
    formats?: ('drawio' | 'png' | 'svg' | 'mermaid')[];
  } = {}
): Promise<{
  success: boolean;
  files: string[];
  errors: string[];
}> {
  const config = loadConfig(projectPath, options.config);

  const analysis = await analyze({
    projectRoot: projectPath,
    configPath: options.config,
  });

  return generate(analysis, {
    outputDir: options.output || config.output.directory,
    filename: config.output.filename,
    formats: options.formats || config.output.formats,
  });
}
