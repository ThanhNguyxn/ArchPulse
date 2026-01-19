/**
 * Architecture Tree View Provider
 * Simplified version that prompts user to use CLI
 */

import * as vscode from 'vscode';

export class ArchitectureTreeProvider
  implements vscode.TreeDataProvider<ArchitectureItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    ArchitectureItem | undefined | null | void
  > = new vscode.EventEmitter<ArchitectureItem | undefined | null | void>();

  readonly onDidChangeTreeData: vscode.Event<
    ArchitectureItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  constructor() {}

  /**
   * Refresh the tree view
   */
  async refresh(): Promise<void> {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ArchitectureItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ArchitectureItem): Promise<ArchitectureItem[]> {
    if (element) {
      return [];
    }

    // Root level items
    return [
      new ArchitectureItem(
        '$(play) Generate Diagram',
        'Click to generate architecture diagram',
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'archpulse.generateDiagram',
          title: 'Generate Diagram',
        }
      ),
      new ArchitectureItem(
        '$(pulse) Analyze Health',
        'Click to analyze architecture health',
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'archpulse.analyzeHealth',
          title: 'Analyze Health',
        }
      ),
      new ArchitectureItem(
        '$(preview) Show Preview',
        'Click to show diagram preview',
        vscode.TreeItemCollapsibleState.None,
        {
          command: 'archpulse.showPreview',
          title: 'Show Preview',
        }
      ),
    ];
  }
}

/**
 * Tree item class
 */
class ArchitectureItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly description: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    command?: vscode.Command
  ) {
    super(label, collapsibleState);
    this.description = description;

    if (command) {
      this.command = command;
    }
  }
}
