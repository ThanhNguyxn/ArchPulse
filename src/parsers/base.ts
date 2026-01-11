/**
 * Base parser interface and utilities
 * @module parsers/base
 */

import { ParsedFile, ImportStatement } from '../types';

/**
 * Abstract interface for language parsers
 */
export interface Parser {
  /** Language name */
  readonly name: string;

  /** File extensions this parser handles */
  readonly extensions: string[];

  /**
   * Parse a source file and extract imports
   * @param content - File content as string
   * @param filePath - Absolute path to the file
   * @param projectRoot - Project root directory
   * @returns Parsed file with imports
   */
  parse(content: string, filePath: string, projectRoot: string): ParsedFile;

  /**
   * Check if this parser can handle the given file
   * @param filePath - File path to check
   */
  canParse(filePath: string): boolean;
}

/**
 * Base implementation with common utilities
 */
export abstract class BaseParser implements Parser {
  abstract readonly name: string;
  abstract readonly extensions: string[];

  abstract parse(content: string, filePath: string, projectRoot: string): ParsedFile;

  /**
   * Check if this parser can handle the given file based on extension
   */
  canParse(filePath: string): boolean {
    const ext = this.getExtension(filePath);
    return this.extensions.includes(ext);
  }

  /**
   * Get file extension from path
   */
  protected getExtension(filePath: string): string {
    const match = filePath.match(/\.[^.]+$/);
    return match ? match[0].toLowerCase() : '';
  }

  /**
   * Get relative path from project root
   */
  protected getRelativePath(filePath: string, projectRoot: string): string {
    const normalizedFile = filePath.replace(/\\/g, '/');
    const normalizedRoot = projectRoot.replace(/\\/g, '/');

    if (normalizedFile.startsWith(normalizedRoot)) {
      return normalizedFile.slice(normalizedRoot.length).replace(/^\//, '');
    }
    return normalizedFile;
  }

  /**
   * Determine if an import is external (from node_modules or system package)
   */
  protected isExternalImport(source: string): boolean {
    // Relative imports start with . or ..
    if (source.startsWith('.') || source.startsWith('/')) {
      return false;
    }
    // Scoped packages like @babel/parser are external
    if (source.startsWith('@')) {
      return true;
    }
    // Bare imports are external (node_modules packages)
    return true;
  }

  /**
   * Determine if an import is relative
   */
  protected isRelativeImport(source: string): boolean {
    return source.startsWith('.') || source.startsWith('/');
  }

  /**
   * Create an empty ParsedFile result
   */
  protected createEmptyResult(
    filePath: string,
    projectRoot: string,
    language: ParsedFile['language']
  ): ParsedFile {
    return {
      filePath,
      relativePath: this.getRelativePath(filePath, projectRoot),
      language,
      imports: [],
      exports: [],
      size: 0,
      errors: [],
    };
  }

  /**
   * Create an import statement object
   */
  protected createImport(
    source: string,
    type: ImportStatement['type'],
    line: number,
    names?: string[]
  ): ImportStatement {
    return {
      source,
      type,
      names,
      isRelative: this.isRelativeImport(source),
      isExternal: this.isExternalImport(source),
      line,
    };
  }
}

/**
 * Get language from file extension
 */
export function getLanguageFromExtension(ext: string): ParsedFile['language'] {
  const extLower = ext.toLowerCase();

  if (['.ts', '.tsx', '.mts', '.cts'].includes(extLower)) {
    return 'typescript';
  }
  if (['.js', '.jsx', '.mjs', '.cjs'].includes(extLower)) {
    return 'javascript';
  }
  if (['.py', '.pyw', '.pyi'].includes(extLower)) {
    return 'python';
  }

  return 'unknown';
}
