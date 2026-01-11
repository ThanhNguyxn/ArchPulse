# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

### Not Yet Implemented
- PNG/SVG export (requires Playwright)
- Unit tests
- GitHub Action integration

---

[0.1.0]: https://github.com/ThanhNguyxn/ArchPulse/releases/tag/v0.1.0
