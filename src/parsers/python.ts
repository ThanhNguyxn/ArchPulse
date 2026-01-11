/**
 * Python parser using regex-based approach
 * @module parsers/python
 */

import { ParsedFile, ImportStatement } from '../types';
import { BaseParser } from './base';

/**
 * Regex patterns for Python imports
 */
const PATTERNS = {
    // import module
    // import module as alias
    // import module1, module2
    simpleImport: /^import\s+([^#\n]+)/gm,

    // from module import name
    // from module import name as alias
    // from module import (name1, name2)
    // from . import name (relative)
    // from .. import name (relative)
    // from .module import name (relative)
    fromImport: /^from\s+([\w.]+)\s+import\s+([^#\n]+)/gm,

    // Relative imports
    relativeFromImport: /^from\s+(\.+[\w.]*)\s+import\s+([^#\n]+)/gm,
};

/**
 * Parser for Python files
 */
export class PythonParser extends BaseParser {
    readonly name = 'Python';
    readonly extensions = ['.py', '.pyw', '.pyi'];

    /**
     * Parse a Python file
     */
    parse(content: string, filePath: string, projectRoot: string): ParsedFile {
        const result = this.createEmptyResult(filePath, projectRoot, 'python');
        result.size = Buffer.byteLength(content, 'utf-8');

        try {
            // Remove comments and strings to avoid false positives
            const cleanedContent = this.removeCommentsAndStrings(content);

            // Extract imports
            const imports = [
                ...this.extractSimpleImports(cleanedContent, content),
                ...this.extractFromImports(cleanedContent, content),
            ];

            result.imports = imports;

            // Extract exports (Python doesn't have explicit exports, but we can find __all__)
            result.exports = this.extractExports(content);
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            result.errors.push(`Parse error: ${message}`);
        }

        return result;
    }

    /**
     * Remove comments and string literals to avoid false matches
     */
    private removeCommentsAndStrings(content: string): string {
        // Remove triple-quoted strings (docstrings)
        let cleaned = content.replace(/'''[\s\S]*?'''/g, '');
        cleaned = cleaned.replace(/"""[\s\S]*?"""/g, '');

        // Remove single-line comments
        cleaned = cleaned.replace(/#.*$/gm, '');

        // Remove single and double quoted strings
        cleaned = cleaned.replace(/'[^']*'/g, "''");
        cleaned = cleaned.replace(/"[^"]*"/g, '""');

        return cleaned;
    }

    /**
     * Get line number for a match position
     */
    private getLineNumber(content: string, position: number): number {
        const upToPosition = content.substring(0, position);
        return (upToPosition.match(/\n/g) || []).length + 1;
    }

    /**
     * Extract simple import statements (import x, import y as z)
     */
    private extractSimpleImports(cleanedContent: string, originalContent: string): ImportStatement[] {
        const imports: ImportStatement[] = [];
        const regex = new RegExp(PATTERNS.simpleImport.source, 'gm');
        let match;

        while ((match = regex.exec(cleanedContent)) !== null) {
            const importPart = match[1].trim();
            const line = this.getLineNumber(originalContent, match.index);

            // Handle multiple imports: import a, b, c
            const modules = importPart.split(',').map(m => m.trim());

            for (const mod of modules) {
                // Handle 'as' alias: import module as alias
                const asParts = mod.split(/\s+as\s+/);
                const moduleName = asParts[0].trim();

                if (moduleName && !moduleName.includes('(')) {
                    imports.push(this.createImport(
                        moduleName,
                        'python-import',
                        line
                    ));
                }
            }
        }

        return imports;
    }

    /**
     * Extract from...import statements
     */
    private extractFromImports(cleanedContent: string, originalContent: string): ImportStatement[] {
        const imports: ImportStatement[] = [];

        // Match both absolute and relative imports
        const regex = /^from\s+(\.{0,3}[\w.]*)\s+import\s+([^#\n]+)/gm;
        let match;

        while ((match = regex.exec(cleanedContent)) !== null) {
            const modulePath = match[1].trim();
            const importPart = match[2].trim();
            const line = this.getLineNumber(originalContent, match.index);

            // Handle parenthesized imports: from x import (a, b, c)
            let names: string[];
            if (importPart.startsWith('(')) {
                // Multi-line import, need to find the closing paren
                const startIdx = match.index + match[0].indexOf('(');
                const endIdx = cleanedContent.indexOf(')', startIdx);
                if (endIdx !== -1) {
                    const parenContent = cleanedContent.substring(startIdx + 1, endIdx);
                    names = this.parseImportNames(parenContent);
                } else {
                    names = this.parseImportNames(importPart.slice(1));
                }
            } else {
                names = this.parseImportNames(importPart);
            }

            // Determine if relative import
            const isRelative = modulePath.startsWith('.');

            imports.push({
                source: modulePath || '.',
                type: 'python-from',
                names,
                isRelative,
                isExternal: !isRelative && !modulePath.includes('.'),
                line,
            });
        }

        return imports;
    }

    /**
     * Parse import names from a string like "a, b as c, d"
     */
    private parseImportNames(importStr: string): string[] {
        // Remove parentheses and handle multi-line
        const cleaned = importStr
            .replace(/[()]/g, '')
            .replace(/\n/g, ' ')
            .trim();

        if (cleaned === '*') {
            return ['*'];
        }

        return cleaned
            .split(',')
            .map(name => {
                // Handle 'as' alias
                const parts = name.trim().split(/\s+as\s+/);
                return parts[0].trim();
            })
            .filter(Boolean);
    }

    /**
     * Extract exports from __all__ definition
     */
    private extractExports(content: string): string[] {
        const exports: string[] = [];

        // Match __all__ = ['name1', 'name2'] or __all__ = ("name1", "name2")
        const allMatch = content.match(/__all__\s*=\s*[\[(]([^\])]+)[\])]/);

        if (allMatch) {
            const namesStr = allMatch[1];
            // Extract quoted strings
            const names = namesStr.match(/['"]([^'"]+)['"]/g);
            if (names) {
                for (const name of names) {
                    exports.push(name.replace(/['"]/g, ''));
                }
            }
        }

        return exports;
    }
}

/**
 * Singleton instance
 */
export const pythonParser = new PythonParser();
