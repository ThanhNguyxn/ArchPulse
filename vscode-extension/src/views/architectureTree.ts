/**
 * Architecture Tree View Provider
 */

import * as vscode from 'vscode';
import * as path from 'path';

export class ArchitectureTreeProvider
  implements vscode.TreeDataProvider<ArchitectureItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    ArchitectureItem | undefined | null | void
  > = new vscode.EventEmitter<ArchitectureItem | undefined | null | void>();

  readonly onDidChangeTreeData: vscode.Event<
    ArchitectureItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private analysis: AnalysisData | undefined;

  constructor() {
    this.refresh();
  }

  /**
   * Refresh the tree view
   */
  async refresh(): Promise<void> {
    await this.loadAnalysis();
    this._onDidChangeTreeData.fire();
  }

  /**
   * Load analysis data
   */
  private async loadAnalysis(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return;
    }

    try {
      const archpulse = await import('archpulse');
      this.analysis = await archpulse.analyze({
        projectRoot: workspaceFolder.uri.fsPath,
        verbose: false,
      });
    } catch {
      this.analysis = undefined;
    }
  }

  getTreeItem(element: ArchitectureItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ArchitectureItem): Promise<ArchitectureItem[]> {
    if (!this.analysis) {
      return [
        new ArchitectureItem(
          'No analysis available',
          'Run "Generate Diagram" first',
          vscode.TreeItemCollapsibleState.None,
          'info'
        ),
      ];
    }

    if (!element) {
      // Root level - show summary and layers
      return this.getRootItems();
    }

    // Child level - show modules in layer
    if (element.itemType === 'layer' && element.layerId) {
      return this.getLayerModules(element.layerId);
    }

    return [];
  }

  /**
   * Get root level items
   */
  private getRootItems(): ArchitectureItem[] {
    if (!this.analysis) return [];

    const items: ArchitectureItem[] = [];

    // Summary item
    items.push(
      new ArchitectureItem(
        'Summary',
        `${this.analysis.filesAnalyzed} files, ${this.analysis.totalDependencies} deps`,
        vscode.TreeItemCollapsibleState.None,
        'summary',
        {
          command: 'archpulse.analyzeHealth',
          title: 'Analyze Health',
        }
      )
    );

    // Layer items
    for (const layer of this.analysis.layers) {
      const item = new ArchitectureItem(
        layer.name,
        `${layer.modules.length} modules`,
        vscode.TreeItemCollapsibleState.Collapsed,
        'layer'
      );
      item.layerId = layer.id;
      item.iconPath = new vscode.ThemeIcon('folder');
      items.push(item);
    }

    return items;
  }

  /**
   * Get modules in a layer
   */
  private getLayerModules(layerId: string): ArchitectureItem[] {
    if (!this.analysis) return [];

    const layer = this.analysis.layers.find((l) => l.id === layerId);
    if (!layer) return [];

    return layer.modules.map((modulePath) => {
      const name = path.basename(modulePath, path.extname(modulePath));
      const node = this.analysis?.graph.nodes.get(modulePath);

      const description = node
        ? `${node.inDegree} in, ${node.outDegree} out`
        : '';

      const item = new ArchitectureItem(
        name,
        description,
        vscode.TreeItemCollapsibleState.None,
        'module'
      );

      item.iconPath = new vscode.ThemeIcon('file-code');
      item.resourceUri = vscode.Uri.file(
        path.join(
          vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || '',
          modulePath
        )
      );
      item.command = {
        command: 'vscode.open',
        title: 'Open File',
        arguments: [item.resourceUri],
      };

      return item;
    });
  }
}

/**
 * Tree item class
 */
class ArchitectureItem extends vscode.TreeItem {
  public layerId?: string;
  public itemType: 'summary' | 'layer' | 'module' | 'info';

  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    itemType: 'summary' | 'layer' | 'module' | 'info',
    command?: vscode.Command
  ) {
    super(label, collapsibleState);
    this.itemType = itemType;
    this.description = description;

    if (command) {
      this.command = command;
    }

    // Set icon based on type
    switch (itemType) {
      case 'summary':
        this.iconPath = new vscode.ThemeIcon('pulse');
        break;
      case 'info':
        this.iconPath = new vscode.ThemeIcon('info');
        break;
    }
  }
}

interface AnalysisData {
  filesAnalyzed: number;
  totalDependencies: number;
  layers: Array<{
    id: string;
    name: string;
    modules: string[];
  }>;
  graph: {
    nodes: Map<string, { inDegree: number; outDegree: number }>;
  };
}
