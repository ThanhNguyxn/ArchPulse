/**
 * TypeScript/JavaScript parser using Babel
 * @module parsers/typescript
 */

import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import { ParsedFile, ImportStatement } from '../types';
import { BaseParser, getLanguageFromExtension } from './base';

/**
 * Parser for TypeScript and JavaScript files
 * Handles ES6 imports, CommonJS require, and dynamic imports
 */
export class TypeScriptParser extends BaseParser {
  readonly name = 'TypeScript/JavaScript';
  readonly extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts'];

  /**
   * Parse a TypeScript/JavaScript file
   */
  parse(content: string, filePath: string, projectRoot: string): ParsedFile {
    const ext = this.getExtension(filePath);
    const language = getLanguageFromExtension(ext);
    const result = this.createEmptyResult(filePath, projectRoot, language);
    result.size = Buffer.byteLength(content, 'utf-8');

    try {
      const ast = this.parseAST(content, filePath);
      const imports = this.extractImports(ast);
      const exports = this.extractExports(ast);

      result.imports = imports;
      result.exports = exports;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push(`Parse error: ${message}`);
    }

    return result;
  }

  /**
   * Parse content into Babel AST
   */
  private parseAST(
    content: string,
    filePath: string
  ): parser.ParseResult<import('@babel/types').File> {
    const isTypeScript = /\.tsx?$/.test(filePath);
    const isJSX = /\.[jt]sx$/.test(filePath);

    const plugins: parser.ParserPlugin[] = [
      'decorators-legacy',
      'classProperties',
      'classPrivateProperties',
      'classPrivateMethods',
      'exportDefaultFrom',
      'exportNamespaceFrom',
      'dynamicImport',
      'nullishCoalescingOperator',
      'optionalChaining',
      'bigInt',
      'topLevelAwait',
    ];

    if (isTypeScript) {
      plugins.push('typescript');
    }

    if (isJSX) {
      plugins.push('jsx');
    }

    return parser.parse(content, {
      sourceType: 'unambiguous',
      plugins,
      errorRecovery: true,
    });
  }

  /**
   * Extract all import statements from AST
   */
  private extractImports(ast: parser.ParseResult<import('@babel/types').File>): ImportStatement[] {
    const imports: ImportStatement[] = [];

    traverse(ast, {
      // ES6 import declarations
      ImportDeclaration: path => {
        const source = path.node.source.value;
        const line = path.node.loc?.start.line ?? 0;
        const specifiers = path.node.specifiers;

        if (specifiers.length === 0) {
          // Side-effect import: import 'module'
          imports.push(this.createImport(source, 'es6-named', line));
        } else {
          const names: string[] = [];
          let hasDefault = false;
          let hasNamespace = false;

          for (const spec of specifiers) {
            if (spec.type === 'ImportDefaultSpecifier') {
              hasDefault = true;
              names.push(spec.local.name);
            } else if (spec.type === 'ImportNamespaceSpecifier') {
              hasNamespace = true;
              names.push(`* as ${spec.local.name}`);
            } else if (spec.type === 'ImportSpecifier') {
              const imported = spec.imported;
              const importedName = imported.type === 'Identifier' ? imported.name : imported.value;
              names.push(importedName);
            }
          }

          let type: ImportStatement['type'] = 'es6-named';
          if (hasDefault && names.length === 1) {
            type = 'es6-default';
          } else if (hasNamespace) {
            type = 'es6-namespace';
          }

          imports.push(this.createImport(source, type, line, names));
        }
      },

      // CommonJS require calls
      CallExpression: path => {
        const callee = path.node.callee;
        const args = path.node.arguments;
        const line = path.node.loc?.start.line ?? 0;

        // require('module')
        if (
          callee.type === 'Identifier' &&
          callee.name === 'require' &&
          args.length === 1 &&
          args[0].type === 'StringLiteral'
        ) {
          const source = args[0].value;
          imports.push(this.createImport(source, 'commonjs', line));
        }

        // Dynamic import: import('module')
        if (callee.type === 'Import' && args.length >= 1 && args[0].type === 'StringLiteral') {
          const source = args[0].value;
          imports.push(this.createImport(source, 'dynamic', line));
        }
      },

      // Re-exports: export * from 'module'
      ExportAllDeclaration: path => {
        const source = path.node.source.value;
        const line = path.node.loc?.start.line ?? 0;
        imports.push(this.createImport(source, 're-export', line));
      },

      // Named re-exports: export { x } from 'module'
      ExportNamedDeclaration: path => {
        if (path.node.source) {
          const source = path.node.source.value;
          const line = path.node.loc?.start.line ?? 0;
          const names = path.node.specifiers
            .map(spec => {
              if (spec.type === 'ExportSpecifier') {
                const exported = spec.exported;
                return exported.type === 'Identifier' ? exported.name : exported.value;
              }
              return '';
            })
            .filter(Boolean);

          imports.push(this.createImport(source, 're-export', line, names));
        }
      },
    });

    return imports;
  }

  /**
   * Extract all exports from AST
   */
  private extractExports(ast: parser.ParseResult<import('@babel/types').File>): string[] {
    const exports: string[] = [];

    traverse(ast, {
      ExportDefaultDeclaration: () => {
        exports.push('default');
      },

      ExportNamedDeclaration: path => {
        // export const x = ...
        if (path.node.declaration) {
          const decl = path.node.declaration;
          if (decl.type === 'VariableDeclaration') {
            for (const d of decl.declarations) {
              if (d.id.type === 'Identifier') {
                exports.push(d.id.name);
              }
            }
          } else if (decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration') {
            if (decl.id) {
              exports.push(decl.id.name);
            }
          }
        }

        // export { x, y }
        for (const spec of path.node.specifiers) {
          if (spec.type === 'ExportSpecifier') {
            const exported = spec.exported;
            exports.push(exported.type === 'Identifier' ? exported.name : exported.value);
          }
        }
      },
    });

    return exports;
  }
}

/**
 * Singleton instance
 */
export const typescriptParser = new TypeScriptParser();
