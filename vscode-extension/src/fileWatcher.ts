/**
 * File Watcher for auto-regenerating diagrams
 */

import * as vscode from 'vscode';

export class FileWatcher implements vscode.Disposable {
  private watcher: vscode.FileSystemWatcher | undefined;
  private debounceTimer: NodeJS.Timeout | undefined;
  private callback: (() => Promise<void>) | undefined;
  private isEnabled = false;

  constructor() {}

  /**
   * Enable file watching
   */
  enable(callback: () => Promise<void>): void {
    if (this.isEnabled) {
      return;
    }

    this.callback = callback;
    this.isEnabled = true;

    // Watch for changes in source files
    const patterns = [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      '**/*.py',
      '**/*.java',
      '**/*.go',
    ];

    // Create a single watcher for all patterns
    this.watcher = vscode.workspace.createFileSystemWatcher(
      '**/*.{ts,tsx,js,jsx,py,java,go}',
      false, // create
      false, // change
      false  // delete
    );

    this.watcher.onDidChange(this.handleChange.bind(this));
    this.watcher.onDidCreate(this.handleChange.bind(this));
    this.watcher.onDidDelete(this.handleChange.bind(this));

    console.log('ArchPulse: File watcher enabled');
  }

  /**
   * Disable file watching
   */
  disable(): void {
    if (!this.isEnabled) {
      return;
    }

    this.isEnabled = false;
    this.callback = undefined;

    if (this.watcher) {
      this.watcher.dispose();
      this.watcher = undefined;
    }

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = undefined;
    }

    console.log('ArchPulse: File watcher disabled');
  }

  /**
   * Handle file change events (debounced)
   */
  private handleChange(uri: vscode.Uri): void {
    // Ignore node_modules and other common directories
    const path = uri.fsPath;
    if (
      path.includes('node_modules') ||
      path.includes('dist') ||
      path.includes('.git') ||
      path.includes('__pycache__')
    ) {
      return;
    }

    // Debounce to avoid rapid regeneration
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      if (this.callback) {
        console.log(`ArchPulse: File changed, regenerating diagram...`);
        try {
          await this.callback();
        } catch (error) {
          console.error('ArchPulse: Auto-regeneration failed', error);
        }
      }
    }, 2000); // 2 second debounce
  }

  dispose(): void {
    this.disable();
  }
}
