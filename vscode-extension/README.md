# ArchPulse - VS Code Extension

Living architecture diagrams for your codebase - auto-generate and maintain architecture diagrams from your code.

## Features

### 🎨 Generate Architecture Diagrams
- Analyze your codebase and generate Draw.io diagrams
- Support for TypeScript, JavaScript, Python, Java, and Go
- Multiple output formats: Draw.io, Mermaid, PNG, SVG

### 📊 Architecture Health Dashboard
- Real-time health score in the status bar
- Metrics: coupling, circular dependencies, orphan modules
- Actionable recommendations

### 👁️ Live Preview
- Preview architecture diagrams in VS Code
- Interactive Mermaid diagram rendering
- Zoom and pan controls

### 🔄 Auto-Update
- Watch mode for automatic regeneration
- Debounced updates on file changes
- Smart file filtering

## Commands

| Command | Description |
|---------|-------------|
| `ArchPulse: Generate Diagram` | Generate architecture diagram from workspace |
| `ArchPulse: Show Preview` | Open diagram preview panel |
| `ArchPulse: Analyze Health` | Analyze and show health metrics |
| `ArchPulse: Open Diagram` | Open the latest generated diagram |

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `archpulse.outputDirectory` | `docs` | Output directory for diagrams |
| `archpulse.outputFormats` | `["drawio", "mermaid"]` | Output formats |
| `archpulse.autoGenerate` | `false` | Auto-regenerate on file changes |
| `archpulse.showHealthInStatusBar` | `true` | Show health score in status bar |
| `archpulse.ignore` | `[...]` | Glob patterns to ignore |

## Usage

1. Open a project folder in VS Code
2. Press `Ctrl+Shift+P` (or `Cmd+Shift+P`)
3. Type "ArchPulse: Generate Diagram"
4. View your architecture diagram!

## Requirements

- VS Code 1.85.0 or higher
- Node.js 18+ (for diagram generation)

## Installation

### From Marketplace
Search for "ArchPulse" in the VS Code Extensions panel.

### From VSIX
```bash
code --install-extension archpulse-vscode-0.1.0.vsix
```

## Development

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Watch mode
npm run watch

# Package
npm run package
```

## License

MIT © [ThanhNguyxn](https://github.com/ThanhNguyxn)
