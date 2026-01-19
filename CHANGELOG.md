# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-01-19

### Added
- **VS Code Extension** (`vscode-extension/`)
  - Generate architecture diagrams from VS Code
  - Live Mermaid diagram preview in WebView
  - Architecture health status bar with A-F grade
  - File watcher for auto-regeneration
  - Tree view showing architecture layers and modules
  - Context menu integration for folder analysis

- **SVG Export**
  - Playwright-based Mermaid to SVG rendering
  - Inline styles for standalone SVG files
  - Configurable background and theme options

- **Watch Mode**
  - Auto-regenerate diagrams on file changes (`-w` flag)
  - Debounced file watching with smart filtering
  - Respects ignore patterns from config

- **Extended Test Coverage**
  - Java parser tests (12 tests)
  - Go parser tests (15 tests)
  - Generator tests for Draw.io and Layout (13 tests)
  - Health Dashboard tests (13 tests)
  - Total: 94 tests

### Changed
- Improved CLI help and documentation
- Better error messages for missing Playwright browser

---

## [0.3.0] - 2026-01-14

### Added
- **PNG Export**
  - Playwright-based Mermaid to PNG rendering
  - Configurable dimensions and themes
  - Run `npx playwright install chromium` to enable

- **Health Dashboard**
  - Score calculation (0-100) with A-F grading
  - Metrics: coupling, circular deps, orphans, layer violations
  - Auto-generated recommendations

- **Multi-Language Support**
  - Java parser (`import` statements)
  - Go parser (`import` statements and blocks)
  - Extended ImportType with `java-import`, `go-import`

---

## [0.2.0] - 2026-01-13

### Added
- **GitHub Action Integration**
  - `action.yml` with Node20 runtime
  - Automatic PR comment with architecture summary
  - Change detection between base and head branches
  - Example workflow in `.github/workflows/archpulse.yml`
  
- **Action Inputs**
  - `path` - Project directory to analyze (default: `.`)
  - `output` - Output directory (default: `docs`)
  - `config` - Custom config file path
  - `comment` - Enable/disable PR comments (default: `true`)
  - `fail-on-circular` - Fail build on circular dependencies

- **Action Outputs**
  - `diagram-path` - Path to generated .drawio file
  - `mermaid-path` - Path to generated .mmd file
  - `files-analyzed` - Number of files analyzed
  - `dependencies-found` - Number of dependencies
  - `circular-dependencies` - Count of circular deps

- **Unit Tests**
  - 41 tests covering parsers and analyzers
  - TypeScript parser tests (14 tests)
  - Python parser tests (11 tests)
  - Dependency graph tests (8 tests)
  - Layer detector tests (8 tests)

### Fixed
- ESLint configuration for fixtures and test files
- TypeScript module resolution issues
- Fixture import paths and types

---

## [0.1.0] - 2026-01-11

### Added
- **Core Infrastructure**
  - TypeScript configuration and project setup
  - Core types and interfaces for config, parsing, analysis, and diagrams
  - Logger utility with colored console output
  - YAML configuration loader with defaults and validation

- **Language Parsers**
  - TypeScript/JavaScript parser using Babel AST
    - ES6 imports, CommonJS require, dynamic imports
    - Named/default exports and re-exports
  - Python parser using regex patterns
    - `import` and `from ... import` statements
    - Relative imports support
  - Parser registry with auto-detection by file extension

- **Dependency Analyzer**
  - File scanner using fast-glob with ignore patterns
  - Dependency graph builder with adjacency list representation
  - Circular dependency detection using DFS algorithm
  - Coupling metrics calculation (in-degree, out-degree)
  - Layer detector with heuristics and custom grouping rules

- **Diagram Generator**
  - Draw.io (mxGraph XML) generator
  - Mermaid diagram generator
  - Hierarchical layout algorithm with layer grouping
  - Color-coded nodes by component type

- **CLI Interface**
  - `archpulse generate [path]` - Generate architecture diagrams
  - `archpulse analyze [path]` - Analyze codebase and show stats
  - `archpulse init` - Create sample configuration file
  - Verbose mode and custom output directory support

- **Library Entry Point**
  - Programmatic API for integration with other tools

---

[0.2.0]: https://github.com/ThanhNguyxn/ArchPulse/releases/tag/v0.2.0
[0.1.0]: https://github.com/ThanhNguyxn/ArchPulse/releases/tag/v0.1.0
