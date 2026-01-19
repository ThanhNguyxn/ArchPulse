/**
 * Generate Diagram Command
 */

import * as vscode from 'vscode';
import * as path from 'path';

export class GenerateDiagramCommand {
  private context: vscode.ExtensionContext;
  private outputChannel: vscode.OutputChannel;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.outputChannel = vscode.window.createOutputChannel('ArchPulse');
  }

  /**
   * Execute the generate diagram command
   */
  async execute(uri?: vscode.Uri): Promise<void> {
    const workspaceFolder = uri
      ? vscode.workspace.getWorkspaceFolder(uri)
      : vscode.workspace.workspaceFolders?.[0];

    if (!workspaceFolder) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }

    const config = vscode.workspace.getConfiguration('archpulse');
    const outputDir = config.get<string>('outputDirectory') || 'docs';
    const formats = config.get<string[]>('outputFormats') || ['drawio', 'mermaid'];

    const targetPath = uri?.fsPath || workspaceFolder.uri.fsPath;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'ArchPulse',
        cancellable: false,
      },
      async (progress) => {
        try {
          progress.report({ message: 'Analyzing codebase...' });

          // Import archpulse dynamically
          const archpulse = await import('archpulse');

          // Analyze the codebase
          const analysis = await archpulse.analyze({
            projectRoot: targetPath,
            verbose: false,
          });

          progress.report({ message: 'Generating diagrams...' });

          // Generate diagrams
          const result = await archpulse.generate(analysis, {
            outputDir: path.join(targetPath, outputDir),
            filename: 'architecture',
            formats: formats as ('drawio' | 'mermaid' | 'png' | 'svg')[],
          });

          if (result.success) {
            const message = `Architecture diagram generated! (${analysis.filesAnalyzed} files, ${analysis.totalDependencies} dependencies)`;

            const action = await vscode.window.showInformationMessage(
              message,
              'Open Diagram',
              'Show Preview'
            );

            if (action === 'Open Diagram') {
              const drawioFile = result.files.find((f) => f.endsWith('.drawio'));
              if (drawioFile) {
                await vscode.commands.executeCommand(
                  'vscode.open',
                  vscode.Uri.file(drawioFile)
                );
              }
            } else if (action === 'Show Preview') {
              await vscode.commands.executeCommand('archpulse.showPreview');
            }

            // Log to output channel
            this.outputChannel.appendLine(`[${new Date().toISOString()}] Diagram generated`);
            this.outputChannel.appendLine(`  Files analyzed: ${analysis.filesAnalyzed}`);
            this.outputChannel.appendLine(`  Dependencies: ${analysis.totalDependencies}`);
            this.outputChannel.appendLine(`  Layers: ${analysis.layers.length}`);
            this.outputChannel.appendLine(`  Output: ${result.files.join(', ')}`);
          } else {
            vscode.window.showErrorMessage(
              `Failed to generate diagram: ${result.errors.join(', ')}`
            );
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          vscode.window.showErrorMessage(`ArchPulse error: ${message}`);
          this.outputChannel.appendLine(`[ERROR] ${message}`);
        }
      }
    );
  }
}
