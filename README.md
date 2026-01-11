<div align="center">

# 🏗️ ArchPulse

### Living Architecture Diagrams for Modern Codebases

[![npm version](https://img.shields.io/npm/v/archpulse.svg?style=flat-square)](https://www.npmjs.com/package/archpulse)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/github/actions/workflow/status/ThanhNguyxn/ArchPulse/ci.yml?branch=main&style=flat-square)](https://github.com/ThanhNguyxn/ArchPulse/actions)
[![GitHub stars](https://img.shields.io/github/stars/ThanhNguyxn/ArchPulse?style=flat-square)](https://github.com/ThanhNguyxn/ArchPulse/stargazers)

**Stop manually drawing architecture diagrams that get outdated in a week.**

[Quick Start](#-quick-start) •
[Features](#-features) •
[Installation](#-installation) •
[Configuration](#-configuration) •
[Roadmap](#-roadmap) •
[Contributing](#-contributing)

</div>

---

## ⚡ Quick Start

```bash
# Install globally
npm install -g archpulse

# Generate architecture diagram
archpulse generate

# ✅ docs/architecture.drawio created!
# ✅ docs/architecture.png created!
```

That's it! Open `docs/architecture.drawio` in [draw.io](https://app.diagrams.net/) to view and edit your architecture diagram.

---

## ✨ Features

### 🔍 Smart Code Analysis
- **Multi-language support**: JavaScript, TypeScript, Python, Java, Go, Rust
- **Dependency mapping**: Automatically detects imports, requires, and module relationships
- **Layer detection**: Identifies frontend/backend separation, MVC patterns, microservices

### 📊 Professional Diagrams
- **Editable output**: Native draw.io format (.drawio) - edit anytime
- **PNG export**: Visual preview for documentation
- **Auto-layout**: Hierarchical layout with minimal edge crossings
- **Color-coded**: Consistent color scheme for different component types

### 🤖 GitHub Action Integration
- **Auto-updates on every PR**: Living documentation that never goes stale
- **Change highlighting**: Visual diff showing what changed
- **PR comments**: Automatic diagram preview in pull requests

### 📈 Architecture Health Metrics
- **Coupling analysis**: Identify tightly coupled modules
- **Circular dependency detection**: Catch architectural issues early
- **Hotspot analysis**: Find frequently changed modules (using git history)

---

## 📦 Installation

### Global Installation (Recommended)
```bash
npm install -g archpulse
```

### Project-level Installation
```bash
npm install --save-dev archpulse
```

### Using npx
```bash
npx archpulse generate
```

---

## 🚀 Usage

### Basic Usage
```bash
# Analyze current directory
archpulse generate

# Analyze specific directory
archpulse generate ./src

# Output to custom location
archpulse generate --output ./diagrams
```

### GitHub Action
Add to your `.github/workflows/archpulse.yml`:

```yaml
name: ArchPulse Auto-Update
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  update-diagram:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Generate Architecture Diagram
        run: npx archpulse generate --detect-changes
      - name: Commit & Push
        run: |
          git config user.name "ArchPulse Bot"
          git config user.email "bot@archpulse.dev"
          git add docs/
          git commit -m "🏗️ Update architecture diagram [skip ci]" || exit 0
          git push
```

---

## ⚙️ Configuration

Create `archpulse.config.yml` in your project root:

```yaml
# Directories to ignore
ignore:
  - node_modules/
  - dist/
  - tests/
  - "**/*.test.ts"

# Custom grouping rules
grouping:
  - pattern: "src/api/*"
    label: "REST API Layer"
    color: "#2ecc71"
  - pattern: "src/db/*"
    label: "Data Layer"
    color: "#9b59b6"
  - pattern: "src/ui/*"
    label: "Frontend"
    color: "#3498db"

# Output options
output:
  directory: docs/
  filename: architecture
  formats:
    - drawio
    - png
    - svg

# Styling
styles:
  frontend: "#3498db"
  backend: "#2ecc71"
  database: "#9b59b6"
  external: "#95a5a6"
```

---

## 🎯 Roadmap

### Phase 1: Core Engine ✅
- [x] Project setup
- [ ] JavaScript/TypeScript parser
- [ ] Python parser
- [ ] Draw.io XML generator
- [ ] PNG export

### Phase 2: GitHub Integration
- [ ] GitHub Action
- [ ] PR comments with diagram preview
- [ ] Change detection and highlighting

### Phase 3: Advanced Features
- [ ] AI-powered architecture insights
- [ ] Circular dependency detection
- [ ] Architecture health metrics
- [ ] Multi-language support (Java, Go, Rust)

### Phase 4: Ecosystem
- [ ] VS Code extension
- [ ] Web dashboard
- [ ] Mermaid/C4 export

---

## 🤝 Contributing

We love contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Clone the repo
git clone https://github.com/ThanhNguyxn/ArchPulse.git
cd ArchPulse

# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm test
```

---

## 📄 License

MIT © [ThanhNguyxn](https://github.com/ThanhNguyxn)

---

<div align="center">

**⭐ Star us on GitHub — it helps!**

[Report Bug](https://github.com/ThanhNguyxn/ArchPulse/issues) •
[Request Feature](https://github.com/ThanhNguyxn/ArchPulse/issues)

</div>
