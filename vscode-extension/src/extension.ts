/**
 * ArchPulse VS Code Extension
 * Main extension entry point
 */

import * as vscode from 'vscode';
import { GenerateDiagramCommand } from './commands/generateDiagram';
import { AnalyzeHealthCommand } from './commands/analyzeHealth';
import { DiagramPreviewPanel } from './panels/diagramPreview';
import { ArchitectureTreeProvider } from './views/architectureTree';
import { StatusBarController } from './statusBar';
import { FileWatcher } from './fileWatcher';

let statusBarController: StatusBarController | undefined;
let fileWatcher: FileWatcher | undefined;

/**
 * Extension activation
 */
export function activate(context: vscode.ExtensionContext): void {
  console.log('ArchPulse extension is now active');

  // Initialize status bar
  statusBarController = new StatusBarController();
  context.subscriptions.push(statusBarController);

  // Initialize file watcher
  fileWatcher = new FileWatcher();
  context.subscriptions.push(fileWatcher);

  // Register commands
  const generateCommand = new GenerateDiagramCommand(context);
  const analyzeCommand = new AnalyzeHealthCommand(statusBarController);

  context.subscriptions.push(
    vscode.commands.registerCommand('archpulse.generateDiagram', async (uri?: vscode.Uri) => {
      await generateCommand.execute(uri);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('archpulse.showPreview', async () => {
      await DiagramPreviewPanel.show(context);
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('archpulse.analyzeHealth', async () => {
      await analyzeCommand.execute();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('archpulse.openDiagram', async () => {
      await openLatestDiagram();
    })
  );

  // Register tree view
  const treeProvider = new ArchitectureTreeProvider();
  context.subscriptions.push(
    vscode.window.registerTreeDataProvider('archpulseExplorer', treeProvider)
  );

  // Auto-analyze on activation if enabled
  const config = vscode.workspace.getConfiguration('archpulse');
  if (config.get<boolean>('showHealthInStatusBar')) {
    analyzeCommand.execute().catch(() => {
      // Silently ignore errors on initial analysis
    });
  }

  // Setup file watcher if auto-generate is enabled
  if (config.get<boolean>('autoGenerate')) {
    fileWatcher.enable(async () => {
      await generateCommand.execute();
    });
  }

  // Listen for configuration changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('archpulse.autoGenerate')) {
        const autoGenerate = vscode.workspace
          .getConfiguration('archpulse')
          .get<boolean>('autoGenerate');

        if (autoGenerate && fileWatcher) {
          fileWatcher.enable(async () => {
            await generateCommand.execute();
          });
        } else if (fileWatcher) {
          fileWatcher.disable();
        }
      }
    })
  );
}

/**
 * Extension deactivation
 */
export function deactivate(): void {
  if (statusBarController) {
    statusBarController.dispose();
  }
  if (fileWatcher) {
    fileWatcher.dispose();
  }
}

/**
 * Open the latest generated diagram
 */
async function openLatestDiagram(): Promise<void> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    vscode.window.showWarningMessage('No workspace folder open');
    return;
  }

  const config = vscode.workspace.getConfiguration('archpulse');
  const outputDir = config.get<string>('outputDirectory') || 'docs';

  const diagramPath = vscode.Uri.joinPath(
    workspaceFolder.uri,
    outputDir,
    'architecture.drawio'
  );

  try {
    await vscode.workspace.fs.stat(diagramPath);
    await vscode.commands.executeCommand('vscode.open', diagramPath);
  } catch {
    vscode.window.showWarningMessage(
      'No diagram found. Run "ArchPulse: Generate Diagram" first.'
    );
  }
}
