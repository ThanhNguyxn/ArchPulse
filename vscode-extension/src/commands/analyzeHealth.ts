/**
 * Analyze Architecture Health Command
 */

import * as vscode from 'vscode';
import { StatusBarController } from '../statusBar';

export class AnalyzeHealthCommand {
  private statusBar: StatusBarController;

  constructor(statusBar: StatusBarController) {
    this.statusBar = statusBar;
  }

  /**
   * Execute the analyze health command
   */
  async execute(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
      vscode.window.showWarningMessage('No workspace folder open');
      return;
    }

    try {
      // Import archpulse dynamically
      const archpulse = await import('archpulse');

      // Analyze the codebase
      const analysis = await archpulse.analyze({
        projectRoot: workspaceFolder.uri.fsPath,
        verbose: false,
      });

      // Import dashboard functions
      // @ts-ignore - dashboard module exists
      const { generateHealthReport } = await import('archpulse/dist/dashboard');

      const report = generateHealthReport(analysis);

      // Update status bar
      this.statusBar.update(report.grade, report.score, report.status);

      // Show detailed report
      const action = await vscode.window.showInformationMessage(
        `Architecture Health: ${report.grade} (${report.metrics.score}/100)`,
        'View Details',
        'View Recommendations'
      );

      if (action === 'View Details') {
        this.showHealthDetails(analysis, report);
      } else if (action === 'View Recommendations') {
        this.showRecommendations(report.recommendations);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(`Analysis failed: ${message}`);
    }
  }

  /**
   * Show health details in a new document
   */
  private async showHealthDetails(
    analysis: { filesAnalyzed: number; totalDependencies: number; layers: unknown[]; metrics: { circularDependencyCount: number; highCouplingModules: string[] } },
    report: { grade: string; metrics: { score: number; coupling: number; orphans: number; layerViolations: number } }
  ): Promise<void> {
    const content = `
# Architecture Health Report

## Overview
- **Grade**: ${report.grade}
- **Score**: ${report.metrics.score}/100

## Metrics
| Metric | Value |
|--------|-------|
| Files Analyzed | ${analysis.filesAnalyzed} |
| Dependencies | ${analysis.totalDependencies} |
| Layers | ${analysis.layers.length} |
| Coupling Score | ${report.metrics.coupling.toFixed(2)} |
| Circular Dependencies | ${analysis.metrics.circularDependencyCount} |
| Orphan Modules | ${report.metrics.orphans} |
| Layer Violations | ${report.metrics.layerViolations} |
| High Coupling Modules | ${analysis.metrics.highCouplingModules.length} |

## Status
${this.getStatusEmoji(report.metrics.score)} ${this.getStatusMessage(report.metrics.score)}
`;

    const doc = await vscode.workspace.openTextDocument({
      content,
      language: 'markdown',
    });
    await vscode.window.showTextDocument(doc, { preview: true });
  }

  /**
   * Show recommendations
   */
  private showRecommendations(recommendations: string[]): void {
    if (recommendations.length === 0) {
      vscode.window.showInformationMessage('No recommendations - architecture looks healthy!');
      return;
    }

    const items = recommendations.map((rec) => ({
      label: rec,
      description: '',
    }));

    vscode.window.showQuickPick(items, {
      placeHolder: 'Architecture Recommendations',
      canPickMany: false,
    });
  }

  private getStatusEmoji(score: number): string {
    if (score >= 90) return '🟢';
    if (score >= 70) return '🟡';
    if (score >= 50) return '🟠';
    return '🔴';
  }

  private getStatusMessage(score: number): string {
    if (score >= 90) return 'Excellent architecture health!';
    if (score >= 70) return 'Good architecture with minor issues.';
    if (score >= 50) return 'Architecture needs attention.';
    return 'Critical architecture issues detected.';
  }
}
