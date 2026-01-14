/**
 * Java Language Parser
 * @module parsers/java
 */

import { Parser } from './base';
import { ParsedFile } from '../types';

const JAVA_IMPORT_REGEX = /^\s*import\s+(?:static\s+)?([a-zA-Z_][\w.]*(?:\.\*)?)\s*;/gm;
const JAVA_PACKAGE_REGEX = /^\s*package\s+([a-zA-Z_][\w.]*)\s*;/m;

export class JavaParser implements Parser {
  readonly name = 'java';
  readonly extensions = ['.java'];

  canParse(filename: string): boolean {
    return this.extensions.some(ext => filename.endsWith(ext));
  }

  parse(content: string, filePath: string, projectRoot: string): ParsedFile {
    // Extract package declaration
    const packageMatch = content.match(JAVA_PACKAGE_REGEX);
    const packageName = packageMatch ? packageMatch[1] : '';

    // Extract imports
    const imports: ParsedFile['imports'] = [];
    let match: RegExpExecArray | null;
    const importRegex = new RegExp(JAVA_IMPORT_REGEX.source, 'gm');
    let lineNum = 1;

    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      const isWildcard = importPath.endsWith('.*');
      const modulePath = isWildcard ? importPath.slice(0, -2) : importPath;

      // Count line number
      const textBefore = content.slice(0, match.index);
      lineNum = textBefore.split('\n').length;

      imports.push({
        source: modulePath,
        type: 'java-import',
        names: isWildcard ? ['*'] : [importPath.split('.').pop() || ''],
        isRelative: false,
        isExternal: isExternalJavaImport(modulePath, packageName),
        line: lineNum,
      });
    }

    // Extract class/interface exports (public declarations)
    const exports: string[] = [];
    const classRegex = /\bpublic\s+(?:abstract\s+)?(?:class|interface|enum)\s+(\w+)/g;
    while ((match = classRegex.exec(content)) !== null) {
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
}

/**
 * Check if import is external (from different root package)
 */
function isExternalJavaImport(importPath: string, packageName: string): boolean {
  if (!packageName) return true;

  const importRoot = importPath.split('.')[0];
  const packageRoot = packageName.split('.')[0];

  // Standard library imports
  if (['java', 'javax', 'sun', 'com.sun'].some(p => importPath.startsWith(p))) {
    return true;
  }

  return importRoot !== packageRoot;
}

export default JavaParser;
