/**
 * GitHub Action entry point
 * @module actions
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { analyze } from '../analyzers';
import { generate, GeneratorResult } from '../generators';
import { loadConfig, DEFAULT_CONFIG } from '../config/loader';
import { postOrUpdateComment, formatAnalysisComment } from './comment';
import { detectChanges } from './diff';
import * as path from 'path';

/**
 * Main action entry point
 */
export async function run(): Promise<void> {
  try {
    // Get inputs
    const projectPath = core.getInput('path') || '.';
    const outputDir = core.getInput('output') || 'docs';
    const configPath = core.getInput('config');
    const token = core.getInput('token');
    const shouldComment = core.getInput('comment') === 'true';
    const failOnCircular = core.getInput('fail-on-circular') === 'true';

    core.info('🏗️ ArchPulse - Architecture Diagram Generator');
    core.info(`📁 Analyzing: ${projectPath}`);

    // Load config
    const resolvedPath = path.resolve(projectPath);
    const config = configPath ? loadConfig(resolvedPath, configPath) : loadConfig(resolvedPath);

    // Run analysis
    core.startGroup('📊 Analyzing codebase');
    const analysis = await analyze({
      projectRoot: resolvedPath,
      configPath,
      verbose: core.isDebug(),
    });
    core.endGroup();

    // Generate diagram
    core.startGroup('🎨 Generating diagram');
    const result: GeneratorResult = await generate(analysis, {
      outputDir,
      filename: config.output.filename || 'architecture',
      formats: config.output.formats || ['drawio', 'mermaid'],
    });
    core.endGroup();

    // Set outputs
    core.setOutput('diagram-path', result.files[0] || '');
    core.setOutput('mermaid-path', result.files.find(f => f.endsWith('.mmd')) || '');
    core.setOutput('files-analyzed', analysis.filesAnalyzed);
    core.setOutput('dependencies-found', analysis.totalDependencies);
    core.setOutput('circular-dependencies', analysis.metrics.circularDependencyCount);

    // Log summary
    core.info('');
    core.info('📈 Analysis Results:');
    core.info(`   Files analyzed: ${analysis.filesAnalyzed}`);
    core.info(`   Dependencies: ${analysis.totalDependencies}`);
    core.info(`   Layers: ${analysis.layers.length}`);
    core.info(`   Circular deps: ${analysis.metrics.circularDependencyCount}`);

    // Detect changes (if in PR context)
    const context = github.context;
    let hasChanges = false;

    if (context.payload.pull_request) {
      core.startGroup('🔍 Detecting changes');
      hasChanges = await detectChanges(result.files[0], context);
      core.setOutput('changed', hasChanges.toString());
      core.endGroup();
    }

    // Post PR comment
    if (shouldComment && context.payload.pull_request && token) {
      core.startGroup('💬 Posting PR comment');
      const octokit = github.getOctokit(token);
      const comment = formatAnalysisComment(analysis, result, hasChanges);
      await postOrUpdateComment(octokit, context, comment);
      core.endGroup();
    }

    // Fail if circular dependencies found
    if (failOnCircular && analysis.metrics.circularDependencyCount > 0) {
      core.setFailed(`❌ Found ${analysis.metrics.circularDependencyCount} circular dependencies`);
      return;
    }

    core.info('');
    core.info('✅ Architecture diagram generated successfully!');
    for (const file of result.files) {
      core.info(`   📄 ${file}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(`❌ ArchPulse failed: ${message}`);
  }
}

// Run the action
run();
