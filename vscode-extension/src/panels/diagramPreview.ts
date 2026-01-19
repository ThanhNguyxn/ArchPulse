/**
 * Diagram Preview Panel (WebView)
 */

import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class DiagramPreviewPanel {
  public static currentPanel: DiagramPreviewPanel | undefined;
  private static readonly viewType = 'archpulsePreview';

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this.panel = panel;
    this.extensionUri = extensionUri;

    this.update();

    this.panel.onDidDispose(() => this.dispose(), null, this.disposables);

    this.panel.onDidChangeViewState(
      () => {
        if (this.panel.visible) {
          this.update();
        }
      },
      null,
      this.disposables
    );
  }

  /**
   * Show or create the preview panel
   */
  public static async show(context: vscode.ExtensionContext): Promise<void> {
    const column = vscode.ViewColumn.Beside;

    if (DiagramPreviewPanel.currentPanel) {
      DiagramPreviewPanel.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      DiagramPreviewPanel.viewType,
      'Architecture Preview',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [context.extensionUri],
      }
    );

    DiagramPreviewPanel.currentPanel = new DiagramPreviewPanel(
      panel,
      context.extensionUri
    );
  }

  /**
   * Update the webview content
   */
  private async update(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      this.panel.webview.html = this.getNoWorkspaceHtml();
      return;
    }

    const config = vscode.workspace.getConfiguration('archpulse');
    const outputDir = config.get<string>('outputDirectory') || 'docs';

    // Try to find mermaid file for preview
    const mermaidPath = path.join(
      workspaceFolder.uri.fsPath,
      outputDir,
      'architecture.mmd'
    );

    try {
      if (fs.existsSync(mermaidPath)) {
        const mermaidContent = fs.readFileSync(mermaidPath, 'utf-8');
        this.panel.webview.html = this.getMermaidHtml(mermaidContent);
      } else {
        this.panel.webview.html = this.getNoDiagramHtml();
      }
    } catch (error) {
      this.panel.webview.html = this.getErrorHtml(
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  /**
   * Generate HTML with Mermaid diagram
   */
  private getMermaidHtml(mermaidCode: string): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Architecture Diagram</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    body {
      margin: 0;
      padding: 20px;
      background-color: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      font-family: var(--vscode-font-family);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 1px solid var(--vscode-panel-border);
    }
    .header h1 {
      margin: 0;
      font-size: 1.4em;
    }
    .toolbar {
      display: flex;
      gap: 10px;
    }
    .toolbar button {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 6px 12px;
      cursor: pointer;
      border-radius: 2px;
    }
    .toolbar button:hover {
      background: var(--vscode-button-hoverBackground);
    }
    .mermaid {
      display: flex;
      justify-content: center;
      overflow: auto;
    }
    .mermaid svg {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🏗️ Architecture Diagram</h1>
    <div class="toolbar">
      <button onclick="zoomIn()">Zoom In</button>
      <button onclick="zoomOut()">Zoom Out</button>
      <button onclick="resetZoom()">Reset</button>
    </div>
  </div>
  
  <div class="mermaid" id="diagram">
${mermaidCode}
  </div>

  <script>
    mermaid.initialize({
      startOnLoad: true,
      theme: document.body.classList.contains('vscode-dark') ? 'dark' : 'default',
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      }
    });

    let scale = 1;
    const diagram = document.getElementById('diagram');

    function zoomIn() {
      scale *= 1.2;
      diagram.style.transform = \`scale(\${scale})\`;
    }

    function zoomOut() {
      scale /= 1.2;
      diagram.style.transform = \`scale(\${scale})\`;
    }

    function resetZoom() {
      scale = 1;
      diagram.style.transform = 'scale(1)';
    }
  </script>
</body>
</html>`;
  }

  /**
   * No workspace HTML
   */
  private getNoWorkspaceHtml(): string {
    return `
<!DOCTYPE html>
<html>
<body style="display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground);">
  <div style="text-align: center;">
    <h2>No Workspace Open</h2>
    <p>Open a folder to generate architecture diagrams.</p>
  </div>
</body>
</html>`;
  }

  /**
   * No diagram HTML
   */
  private getNoDiagramHtml(): string {
    return `
<!DOCTYPE html>
<html>
<body style="display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground);">
  <div style="text-align: center;">
    <h2>No Diagram Found</h2>
    <p>Run <strong>ArchPulse: Generate Diagram</strong> command to create one.</p>
    <p style="color: var(--vscode-descriptionForeground); font-size: 0.9em;">
      Use Ctrl+Shift+P (Cmd+Shift+P) and search for "ArchPulse"
    </p>
  </div>
</body>
</html>`;
  }

  /**
   * Error HTML
   */
  private getErrorHtml(error: string): string {
    return `
<!DOCTYPE html>
<html>
<body style="display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: var(--vscode-editor-background); color: var(--vscode-editor-foreground);">
  <div style="text-align: center;">
    <h2>Error Loading Diagram</h2>
    <p style="color: var(--vscode-errorForeground);">${error}</p>
  </div>
</body>
</html>`;
  }

  public dispose(): void {
    DiagramPreviewPanel.currentPanel = undefined;

    this.panel.dispose();

    while (this.disposables.length) {
      const disposable = this.disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
