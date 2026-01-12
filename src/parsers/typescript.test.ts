/**
 * Unit tests for TypeScript/JavaScript parser
 */

import * as path from 'path';
import * as fs from 'fs';
import { TypeScriptParser } from './typescript';

describe('TypeScriptParser', () => {
  const parser = new TypeScriptParser();
  const fixturesPath = path.join(__dirname, '__fixtures__', 'sample-ts');

  describe('parse()', () => {
    it('should parse ES6 imports', () => {
      const content = `
        import { UserService } from './services/userService';
        import { DatabaseClient } from '../shared/database';
        import type { User } from '../types';
      `;
      const result = parser.parse(content, '/test/file.ts', '/test');

      expect(result.imports).toHaveLength(3);
      expect(result.imports[0].source).toBe('./services/userService');
      expect(result.imports[0].type).toBe('es6-named');
      expect(result.imports[0].names).toContain('UserService');
    });

    it('should parse default imports', () => {
      const content = `import UserController from './controllers/userController';`;
      const result = parser.parse(content, '/test/file.ts', '/test');

      expect(result.imports).toHaveLength(1);
      expect(result.imports[0].type).toBe('es6-default');
      expect(result.imports[0].names).toContain('UserController');
    });

    it('should parse namespace imports', () => {
      const content = `import * as path from 'path';`;
      const result = parser.parse(content, '/test/file.ts', '/test');

      expect(result.imports).toHaveLength(1);
      expect(result.imports[0].type).toBe('es6-namespace');
      expect(result.imports[0].source).toBe('path');
    });

    it('should parse CommonJS require', () => {
      const content = `const fs = require('fs');`;
      const result = parser.parse(content, '/test/file.js', '/test');

      expect(result.imports).toHaveLength(1);
      expect(result.imports[0].type).toBe('commonjs');
      expect(result.imports[0].source).toBe('fs');
    });

    it('should parse dynamic imports', () => {
      const content = `const module = await import('./dynamic-module');`;
      const result = parser.parse(content, '/test/file.ts', '/test');

      expect(result.imports).toHaveLength(1);
      expect(result.imports[0].type).toBe('dynamic');
      expect(result.imports[0].source).toBe('./dynamic-module');
    });

    it('should parse re-exports', () => {
      const content = `
        export * from './utils';
        export { helper } from './helpers';
      `;
      const result = parser.parse(content, '/test/file.ts', '/test');

      expect(result.imports).toHaveLength(2);
      expect(result.imports[0].type).toBe('re-export');
      expect(result.imports[1].names).toContain('helper');
    });

    it('should extract exports', () => {
      const content = `
        export const foo = 1;
        export function bar() {}
        export class Baz {}
        export default class Main {}
      `;
      const result = parser.parse(content, '/test/file.ts', '/test');

      expect(result.exports).toContain('foo');
      expect(result.exports).toContain('bar');
      expect(result.exports).toContain('Baz');
      expect(result.exports).toContain('default');
    });

    it('should handle TypeScript syntax', () => {
      const content = `
        import type { User } from '../types';
        interface Props { name: string; }
        const fn = (x: number): string => x.toString();
      `;
      const result = parser.parse(content, '/test/file.ts', '/test');

      expect(result.errors).toHaveLength(0);
      expect(result.imports).toHaveLength(1);
    });

    it('should handle JSX syntax', () => {
      const content = `
        import React from 'react';
        const Component = () => <div>Hello</div>;
      `;
      const result = parser.parse(content, '/test/file.tsx', '/test');

      expect(result.errors).toHaveLength(0);
      expect(result.imports).toHaveLength(1);
    });

    it('should handle parse errors gracefully', () => {
      const content = `import { broken from`;
      const result = parser.parse(content, '/test/file.ts', '/test');

      // Error recovery should still work
      expect(result.filePath).toBe('/test/file.ts');
    });

    it('should detect relative vs external imports', () => {
      const content = `
        import { relative } from './local';
        import { external } from 'some-package';
        import path from 'path';
      `;
      const result = parser.parse(content, '/test/file.ts', '/test');

      expect(result.imports[0].isRelative).toBe(true);
      expect(result.imports[1].isRelative).toBe(false);
      expect(result.imports[2].isRelative).toBe(false);
    });
  });

  describe('supports()', () => {
    it('should support TypeScript files', () => {
      expect(parser.canParse('file.ts')).toBe(true);
      expect(parser.canParse('file.tsx')).toBe(true);
    });

    it('should support JavaScript files', () => {
      expect(parser.canParse('file.js')).toBe(true);
      expect(parser.canParse('file.jsx')).toBe(true);
      expect(parser.canParse('file.mjs')).toBe(true);
      expect(parser.canParse('file.cjs')).toBe(true);
    });

    it('should not support other files', () => {
      expect(parser.canParse('file.py')).toBe(false);
      expect(parser.canParse('file.go')).toBe(false);
      expect(parser.canParse('file.rs')).toBe(false);
    });
  });
});
