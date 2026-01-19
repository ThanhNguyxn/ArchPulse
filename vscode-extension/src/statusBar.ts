/**
 * Status Bar Controller
 */

import * as vscode from 'vscode';

export class StatusBarController implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = 'archpulse.analyzeHealth';
    this.statusBarItem.tooltip = 'Click to analyze architecture health';
    this.statusBarItem.text = '$(pulse) ArchPulse';

    const config = vscode.workspace.getConfiguration('archpulse');
    if (config.get<boolean>('showHealthInStatusBar')) {
      this.statusBarItem.show();
    }
  }

  /**
   * Update the status bar with health information
   */
  update(grade: string, score: number, status: 'healthy' | 'warning' | 'critical'): void {
    const icon = this.getIcon(status);
    const color = this.getColor(status);

    this.statusBarItem.text = `${icon} ${grade} (${score})`;
    this.statusBarItem.backgroundColor = color;
    this.statusBarItem.tooltip = `Architecture Health: ${grade} - Score: ${score}/100\nClick to refresh`;
    this.statusBarItem.show();
  }

  /**
   * Show loading state
   */
  setLoading(): void {
    this.statusBarItem.text = '$(loading~spin) Analyzing...';
  }

  /**
   * Get icon based on status
   */
  private getIcon(status: 'healthy' | 'warning' | 'critical'): string {
    switch (status) {
      case 'healthy':
        return '$(check)';
      case 'warning':
        return '$(warning)';
      case 'critical':
        return '$(error)';
    }
  }

  /**
   * Get background color based on status
   */
  private getColor(status: 'healthy' | 'warning' | 'critical'): vscode.ThemeColor | undefined {
    switch (status) {
      case 'critical':
        return new vscode.ThemeColor('statusBarItem.errorBackground');
      case 'warning':
        return new vscode.ThemeColor('statusBarItem.warningBackground');
      default:
        return undefined;
    }
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}
