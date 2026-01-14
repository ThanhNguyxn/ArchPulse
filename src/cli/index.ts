#!/usr/bin/env node

/**
 * ArchPulse CLI entry point
 * @module cli
 */

import { Command } from 'commander';
import { version, description } from '../../package.json';
import { executeGenerate } from './commands/generate';
import { createSampleConfig } from '../config/loader';
import { success, error, info } from '../utils/logger';
import * as path from 'path';

/** Options for generate command */
interface GenerateCommandOptions {
  output: string;
  config?: string;
  format?: string;
  detectChanges: boolean;
  watch: boolean;
  verbose: boolean;
}

/** Options for analyze command */
interface AnalyzeCommandOptions {
  config?: string;
  verbose: boolean;
}

const program = new Command();

program
  .name('archpulse')
  .description(description || 'Living architecture diagrams for modern codebases')
  .version(version || '0.1.0');

// Generate command
program
  .command('generate')
  .description('Generate architecture diagram from codebase')
  .argument('[path]', 'Path to project directory', '.')
  .option('-o, --output <dir>', 'Output directory', 'docs')
  .option('-c, --config <file>', 'Path to config file')
  .option('-f, --format <formats>', 'Output formats: drawio,mermaid,png (comma-separated)')
  .option('--detect-changes', 'Highlight changes (for PR integration)', false)
  .option('-w, --watch', 'Watch for changes and regenerate', false)
  .option('-v, --verbose', 'Enable verbose output', false)
  .action(async (projectPath: string, options: GenerateCommandOptions) => {
    const result = await executeGenerate({
      path: projectPath,
      output: options.output,
      config: options.config,
      formats: options.format
        ?.split(',')
        .map(f => f.trim() as 'drawio' | 'png' | 'svg' | 'mermaid'),
      detectChanges: options.detectChanges,
      watch: options.watch,
      verbose: options.verbose,
    });

    process.exit(result.success ? 0 : 1);
  });

// Init command - create sample config
program
  .command('init')
  .description('Create a sample archpulse.config.yml file')
  .argument('[path]', 'Path to project directory', '.')
  .action((projectPath: string) => {
    try {
      const fullPath = path.resolve(projectPath);
      const configPath = createSampleConfig(fullPath);
      success(`Created config file: ${configPath}`);
      info('Edit this file to customize ArchPulse behavior.');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      error(`Failed to create config: ${message}`);
      process.exit(1);
    }
  });

// Analyze command - just show analysis without generating
program
  .command('analyze')
  .description('Analyze codebase and show statistics (no diagram generation)')
  .argument('[path]', 'Path to project directory', '.')
  .option('-c, --config <file>', 'Path to config file')
  .option('-v, --verbose', 'Enable verbose output', false)
  .action(async (projectPath: string, options: AnalyzeCommandOptions) => {
    const { analyze, getAnalysisSummary } = await import('../analyzers');
    const { configureLogger, header, divider } = await import('../utils/logger');

    configureLogger({ verbose: options.verbose });
    header('ArchPulse - Architecture Analysis');

    try {
      const analysis = await analyze({
        projectRoot: path.resolve(projectPath),
        configPath: options.config,
        verbose: options.verbose,
      });

      divider();
      info(getAnalysisSummary(analysis));

      process.exit(0);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      error(`Analysis failed: ${message}`);
      process.exit(1);
    }
  });

// Parse and execute
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
