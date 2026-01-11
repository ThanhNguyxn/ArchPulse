/**
 * Parser registry and factory
 * @module parsers
 */

import { Parser } from './base';
import { typescriptParser } from './typescript';
import { pythonParser } from './python';
import { ParsedFile } from '../types';
import { debug } from '../utils/logger';

/**
 * Registry of all available parsers
 */
const parsers: Parser[] = [typescriptParser, pythonParser];

/**
 * Get the appropriate parser for a file
 */
export function getParserForFile(filePath: string): Parser | null {
  for (const parser of parsers) {
    if (parser.canParse(filePath)) {
      return parser;
    }
  }
  return null;
}

/**
 * Check if a file can be parsed
 */
export function canParseFile(filePath: string): boolean {
  return getParserForFile(filePath) !== null;
}

/**
 * Get all supported file extensions
 */
export function getSupportedExtensions(): string[] {
  const extensions = new Set<string>();
  for (const parser of parsers) {
    for (const ext of parser.extensions) {
      extensions.add(ext);
    }
  }
  return Array.from(extensions);
}

/**
 * Parse a file and extract imports
 */
export function parseFile(
  content: string,
  filePath: string,
  projectRoot: string
): ParsedFile | null {
  const parser = getParserForFile(filePath);

  if (!parser) {
    debug(`No parser available for: ${filePath}`);
    return null;
  }

  debug(`Parsing with ${parser.name}: ${filePath}`);
  return parser.parse(content, filePath, projectRoot);
}

/**
 * Register a custom parser
 */
export function registerParser(parser: Parser): void {
  parsers.push(parser);
}

// Re-export types and parsers
export { Parser } from './base';
export { typescriptParser } from './typescript';
export { pythonParser } from './python';
