# Contributing to ArchPulse

First off, thank you for considering contributing to ArchPulse! 🎉

## Code of Conduct

This project and everyone participating in it is governed by our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

**When reporting a bug, include:**
- A clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Your environment (OS, Node.js version, etc.)
- Code samples or repository links if applicable

### 💡 Suggesting Features

Feature requests are welcome! Please:
- Use a clear, descriptive title
- Explain the use case
- Describe the expected behavior
- Consider how it fits with existing features

### 🔧 Pull Requests

1. **Fork the repo** and create your branch from `main`
2. **Install dependencies**: `npm install`
3. **Make your changes**
4. **Add tests** for new functionality
5. **Run tests**: `npm test`
6. **Run linting**: `npm run lint`
7. **Commit** with a descriptive message
8. **Push** and create a Pull Request

## Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/ArchPulse.git
cd ArchPulse

# Install dependencies
npm install

# Run in development mode (watch for changes)
npm run dev

# Run tests
npm test

# Run linting
npm run lint

# Build for production
npm run build
```

## Project Structure

```
ArchPulse/
├── src/
│   ├── cli/           # CLI entry point
│   ├── parsers/       # Language-specific AST parsers
│   ├── analyzers/     # Dependency analysis logic
│   ├── generators/    # Draw.io XML generation
│   └── actions/       # GitHub Action logic
├── tests/             # Test files
├── fixtures/          # Test fixtures (sample codebases)
└── docs/              # Documentation
```

## Coding Guidelines

- **TypeScript**: Use strict typing, avoid `any`
- **Naming**: Use descriptive names (e.g., `extractImportStatements` not `getImports`)
- **Documentation**: Add JSDoc comments to exported functions
- **Testing**: Co-locate tests with source files (`parser.ts` → `parser.test.ts`)
- **Error handling**: Use descriptive error messages

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code restructuring
- `test:` - Adding tests
- `chore:` - Build/config changes

**Examples:**
```
feat: add Python import extraction support
fix: handle circular dependencies in analyzer
docs: update README with configuration options
```

## Questions?

Feel free to open an issue or reach out!

---

Thank you for contributing! 💙
