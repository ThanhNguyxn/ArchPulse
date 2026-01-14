/**
 * Go Language Parser
 * @module parsers/go
 */

import { Parser } from './base';
import { ParsedFile } from '../types';

// Match single import: import "fmt"
const GO_SINGLE_IMPORT_REGEX = /^\s*import\s+"([^"]+)"\s*$/gm;

// Match import block: import ( ... )
const GO_IMPORT_BLOCK_REGEX = /import\s*\(\s*([\s\S]*?)\s*\)/g;

// Match individual imports inside block
const GO_BLOCK_IMPORT_REGEX = /(?:(\w+)\s+)?"([^"]+)"/g;

// Match package declaration
const GO_PACKAGE_REGEX = /^\s*package\s+(\w+)/m;

export class GoParser implements Parser {
  readonly name = 'go';
  readonly extensions = ['.go'];

  canParse(filename: string): boolean {
    return this.extensions.some(ext => filename.endsWith(ext));
  }

  parse(content: string, filePath: string, projectRoot: string): ParsedFile {
    const imports: ParsedFile['imports'] = [];
    const exports: string[] = [];

    // Extract single imports
    let match: RegExpExecArray | null;
    const singleRegex = new RegExp(GO_SINGLE_IMPORT_REGEX.source, 'gm');
    let lineNum = 1;

    while ((match = singleRegex.exec(content)) !== null) {
      const importPath = match[1];
      const textBefore = content.slice(0, match.index);
      lineNum = textBefore.split('\n').length;

      imports.push(this.createImport(importPath, lineNum));
    }

    // Extract import blocks
    const blockRegex = new RegExp(GO_IMPORT_BLOCK_REGEX.source, 'g');
    while ((match = blockRegex.exec(content)) !== null) {
      const blockContent = match[1];
      const blockStart = match.index;
      const innerRegex = new RegExp(GO_BLOCK_IMPORT_REGEX.source, 'g');
      let innerMatch: RegExpExecArray | null;

      while ((innerMatch = innerRegex.exec(blockContent)) !== null) {
        const alias = innerMatch[1] || '';
        const importPath = innerMatch[2];
        const textBefore = content.slice(0, blockStart + innerMatch.index);
        lineNum = textBefore.split('\n').length;
        imports.push(this.createImport(importPath, lineNum, alias));
      }
    }

    // Extract exported functions/types (capitalized identifiers)
    const funcRegex = /^func\s+(\([^)]+\)\s+)?([A-Z]\w*)/gm;
    while ((match = funcRegex.exec(content)) !== null) {
      exports.push(match[2]);
    }

    const typeRegex = /^type\s+([A-Z]\w*)\s+/gm;
    while ((match = typeRegex.exec(content)) !== null) {
      exports.push(match[1]);
    }

    return {
      filePath,
      relativePath: filePath.replace(projectRoot, '').replace(/^[/\\]/, ''),
      language: 'unknown' as const,
      imports,
      exports,
      size: content.length,
      errors: [],
    };
  }

  private createImport(importPath: string, line: number, alias?: string): ParsedFile['imports'][0] {
    const parts = importPath.split('/');
    const moduleName = parts[parts.length - 1];

    return {
      source: importPath,
      type: 'go-import',
      names: alias ? [alias] : [moduleName],
      isRelative: importPath.startsWith('./') || importPath.startsWith('../'),
      isExternal: this.isExternal(importPath),
      line,
    };
  }

  private isExternal(importPath: string): boolean {
    // Relative paths are not external
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      return false;
    }

    // Standard library imports don't contain dots in first segment
    const firstPart = importPath.split('/')[0];

    // External packages typically have domain-like first segment
    if (firstPart.includes('.')) {
      return true;
    }

    // Common external prefixes
    if (
      ['github.com', 'gitlab.com', 'golang.org', 'gopkg.in', 'google.golang.org'].some(ext =>
        importPath.startsWith(ext)
      )
    ) {
      return true;
    }

    // Standard library (known packages)
    const stdLibPkgs = [
      'fmt',
      'os',
      'io',
      'net',
      'http',
      'context',
      'sync',
      'time',
      'strings',
      'strconv',
      'encoding',
      'json',
      'log',
      'errors',
      'testing',
      'flag',
      'path',
      'filepath',
      'bufio',
      'bytes',
      'crypto',
      'database',
      'sql',
      'html',
      'image',
      'math',
      'reflect',
      'regexp',
      'runtime',
      'sort',
      'syscall',
      'unicode',
    ];

    return !stdLibPkgs.includes(firstPart);
  }
}

export default GoParser;
