/**
 * Analyze Architecture Health Command
 * Uses CLI instead of direct import to avoid bundling issues
 */

import * as vscode from 'vscode';
import { spawn } from 'child_process';
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
      const result = await this.runAnalyzeCLI(workspaceFolder.uri.fsPath);

      if (result.success && result.data) {
        // Parse output to extract metrics
        const grade = this.extractGrade(result.data);
        const score = this.extractScore(result.data);

        // Update status bar
        this.statusBar.update(grade, score, score >= 70 ? 'healthy' : score >= 50 ? 'warning' : 'critical');

        // Show result
        const action = await vscode.window.showInformationMessage(
          `Architecture Health: ${grade} (${score}/100)`,
          'View Details'
        );

        if (action === 'View Details') {
          this.showAnalysisOutput(result.data);
        }
      } else {
        throw new Error(result.error || 'Analysis failed');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      
      if (message.includes('not found') || message.includes('not recognized')) {
        const action = await vscode.window.showErrorMessage(
          'ArchPulse CLI not found. Please install it globally.',
          'Install Now'
        );
        if (action === 'Install Now') {
          const terminal = vscode.window.createTerminal('ArchPulse Install');
          terminal.sendText('npm install -g archpulse');
          terminal.show();
        }
      } else {
        vscode.window.showErrorMessage(`Analysis failed: ${message}`);
      }
    }
  }

  /**
   * Run archpulse analyze CLI command
   */
  private runAnalyzeCLI(projectPath: string): Promise<{ success: boolean; data?: string; error?: string }> {
    return new Promise((resolve) => {
      const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      const child = spawn(npx, ['archpulse', 'analyze', '.'], {
        cwd: projectPath,
        shell: true,
      });

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true, data: stdout });
        } else {
          resolve({ success: false, error: stderr || `Exit code: ${code}` });
        }
      });

      child.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    });
  }

  /**
   * Extract grade from CLI output
   */
  private extractGrade(output: string): string {
    const match = output.match(/Grade:\s*([A-F][+-]?)/i);
    return match ? match[1] : 'B';
  }

  /**
   * Extract score from CLI output
   */
  private extractScore(output: string): number {
    const match = output.match(/Score:\s*(\d+)/i);
    return match ? parseInt(match[1], 10) : 75;
  }

  /**
   * Show analysis output in a document
   */
  private async showAnalysisOutput(output: string): Promise<void> {
    const doc = await vscode.workspace.openTextDocument({
      content: output,
      language: 'markdown',
    });
    await vscode.window.showTextDocument(doc, { preview: true });
  }
}
