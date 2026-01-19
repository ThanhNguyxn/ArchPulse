/**
 * Generate Diagram Command
 * Uses CLI instead of direct import to avoid bundling issues
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { spawn } from 'child_process';

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

    const targetPath = uri?.fsPath || workspaceFolder.uri.fsPath;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'ArchPulse',
        cancellable: false,
      },
      async (progress) => {
        try {
          progress.report({ message: 'Generating architecture diagram...' });

          // Use CLI command instead of direct import
          const result = await this.runArchpulseCLI(targetPath, outputDir);

          if (result.success) {
            const outputPath = path.join(targetPath, outputDir, 'architecture.drawio');
            
            const action = await vscode.window.showInformationMessage(
              `Architecture diagram generated successfully!`,
              'Open Diagram',
              'Show in Explorer'
            );

            if (action === 'Open Diagram') {
              await vscode.commands.executeCommand(
                'vscode.open',
                vscode.Uri.file(outputPath)
              );
            } else if (action === 'Show in Explorer') {
              await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(outputPath));
            }
          } else {
            throw new Error(result.error || 'Unknown error');
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.outputChannel.appendLine(`Error: ${message}`);
          
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
            vscode.window.showErrorMessage(`Failed to generate diagram: ${message}`);
          }
        }
      }
    );
  }

  /**
   * Run archpulse CLI command
   */
  private runArchpulseCLI(
    projectPath: string,
    outputDir: string
  ): Promise<{ success: boolean; error?: string }> {
    return new Promise((resolve) => {
      const args = ['generate', '.', '--output', outputDir];

      const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
      const child = spawn(npx, ['archpulse', ...args], {
        cwd: projectPath,
        shell: true,
      });

      let stderr = '';

      child.stderr.on('data', (data) => {
        stderr += data.toString();
        this.outputChannel.appendLine(data.toString());
      });

      child.stdout.on('data', (data) => {
        this.outputChannel.appendLine(data.toString());
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: stderr || `Exit code: ${code}` });
        }
      });

      child.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });
    });
  }
}
