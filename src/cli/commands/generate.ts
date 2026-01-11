/**
 * Generate command implementation
 * @module cli/commands/generate
 */

import * as path from 'path';
import { GenerateOptions, GenerateResult, ArchPulseConfig } from '../../types';
import { loadConfig } from '../../config/loader';
import { analyze, getAnalysisSummary } from '../../analyzers';
import { generate } from '../../generators';
import {
    logger,
    configureLogger,
    header,
    success,
    error,
    info,
    metrics,
    divider,
} from '../../utils/logger';
import { findProjectRoot } from '../../analyzers/scanner';

/**
 * Execute the generate command
 */
export async function executeGenerate(options: GenerateOptions): Promise<GenerateResult> {
    const startTime = Date.now();

    // Configure logger
    configureLogger({ verbose: options.verbose });

    // Display header
    header('ArchPulse - Architecture Diagram Generator');

    try {
        // Resolve project root
        const projectRoot = path.resolve(options.path);
        info(`Project: ${projectRoot}`);
        divider();

        // Load configuration
        const config = loadConfig(projectRoot, options.config);

        // Analyze the codebase
        const analysis = await analyze({
            projectRoot,
            configPath: options.config,
            verbose: options.verbose,
        });

        if (analysis.filesAnalyzed === 0) {
            error('No files to analyze. Check your configuration.');
            return {
                success: false,
                error: 'No files to analyze',
                duration: Date.now() - startTime,
            };
        }

        divider();

        // Generate diagrams
        info('Generating diagrams...');

        const genResult = await generate(analysis, {
            outputDir: options.output || config.output.directory,
            filename: config.output.filename,
            formats: config.output.formats,
            drawioOptions: {
                title: `${path.basename(projectRoot)} Architecture`,
            },
        });

        if (!genResult.success) {
            for (const err of genResult.errors) {
                error(err);
            }
            return {
                success: false,
                error: genResult.errors.join('; '),
                duration: Date.now() - startTime,
            };
        }

        divider();

        // Show summary
        success('Architecture diagram generated successfully!');

        console.log('');
        info('Output files:');
        for (const file of genResult.files) {
            console.log(`  📄 ${file}`);
        }

        console.log('');
        metrics({
            'Files analyzed': analysis.filesAnalyzed,
            'Dependencies found': analysis.totalDependencies,
            'Layers detected': analysis.layers.length,
            'Circular deps': analysis.metrics.circularDependencyCount,
            'Time': `${Date.now() - startTime}ms`,
        });

        // Warnings
        if (analysis.metrics.circularDependencyCount > 0) {
            console.log('');
            logger.warn(`⚠️  ${analysis.metrics.circularDependencyCount} circular dependencies detected`);
        }

        if (analysis.metrics.highCouplingModules.length > 0) {
            logger.warn(`⚠️  ${analysis.metrics.highCouplingModules.length} modules with high coupling`);
        }

        return {
            success: true,
            drawioPath: genResult.files.find(f => f.endsWith('.drawio')),
            pngPath: genResult.files.find(f => f.endsWith('.png')),
            analysis,
            duration: Date.now() - startTime,
        };

    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        error(`Failed to generate diagram: ${message}`);

        if (options.verbose && err instanceof Error) {
            console.error(err.stack);
        }

        return {
            success: false,
            error: message,
            duration: Date.now() - startTime,
        };
    }
}

/**
 * Print analysis summary to console
 */
export function printAnalysisSummary(options: { projectRoot: string; config?: string; verbose?: boolean }): void {
    analyze({
        projectRoot: path.resolve(options.projectRoot),
        configPath: options.config,
        verbose: options.verbose,
    }).then(analysis => {
        console.log(getAnalysisSummary(analysis));
    }).catch(err => {
        error(`Analysis failed: ${err.message}`);
    });
}
