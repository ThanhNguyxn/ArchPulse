/**
 * Unit tests for dependency graph builder
 */

import { buildDependencyGraph } from './graph';
import { ParsedFile } from '../types';

describe('buildDependencyGraph', () => {
  const projectRoot = '/test/project';

  const createParsedFile = (
    filePath: string,
    imports: { source: string; isRelative: boolean }[] = [],
    exports: string[] = []
  ): ParsedFile => ({
    filePath,
    relativePath: filePath.replace(projectRoot + '/', ''),
    language: 'typescript',
    size: 100,
    imports: imports.map(imp => ({
      source: imp.source,
      type: 'es6-named' as const,
      line: 1,
      isRelative: imp.isRelative,
      isExternal: !imp.isRelative,
      names: [],
    })),
    exports,
    errors: [],
  });

  describe('node creation', () => {
    it('should create nodes for all files', () => {
      const files = [
        createParsedFile('/test/project/src/a.ts'),
        createParsedFile('/test/project/src/b.ts'),
        createParsedFile('/test/project/src/c.ts'),
      ];

      const graph = buildDependencyGraph(files, projectRoot);

      expect(graph.nodes.size).toBe(3);
      expect(graph.nodes.has('src/a.ts')).toBe(true);
      expect(graph.nodes.has('src/b.ts')).toBe(true);
      expect(graph.nodes.has('src/c.ts')).toBe(true);
    });

    it('should set correct node metadata', () => {
      const files = [createParsedFile('/test/project/src/service.ts', [], ['UserService'])];

      const graph = buildDependencyGraph(files, projectRoot);
      const node = graph.nodes.get('src/service.ts');

      expect(node).toBeDefined();
      expect(node!.path).toBe('src/service.ts');
    });
  });

  describe('edge creation', () => {
    it('should create edges for internal dependencies', () => {
      const files = [
        createParsedFile('/test/project/src/a.ts', [{ source: './b', isRelative: true }]),
        createParsedFile('/test/project/src/b.ts'),
      ];

      const graph = buildDependencyGraph(files, projectRoot);

      expect(graph.edges.length).toBeGreaterThanOrEqual(1);
      const edge = graph.edges.find(e => e.from === 'src/a.ts' && e.to === 'src/b.ts');
      expect(edge).toBeDefined();
    });

    it('should track external dependencies', () => {
      const files = [
        createParsedFile('/test/project/src/a.ts', [
          { source: 'lodash', isRelative: false },
          { source: 'express', isRelative: false },
        ]),
      ];

      const graph = buildDependencyGraph(files, projectRoot);

      expect(graph.externalDependencies.has('lodash')).toBe(true);
      expect(graph.externalDependencies.has('express')).toBe(true);
    });
  });

  describe('circular dependency detection', () => {
    it('should detect simple circular dependency', () => {
      const files = [
        createParsedFile('/test/project/src/a.ts', [{ source: './b', isRelative: true }]),
        createParsedFile('/test/project/src/b.ts', [{ source: './a', isRelative: true }]),
      ];

      const graph = buildDependencyGraph(files, projectRoot);

      expect(graph.circularDependencies.length).toBeGreaterThan(0);
    });

    it('should detect transitive circular dependency', () => {
      const files = [
        createParsedFile('/test/project/src/a.ts', [{ source: './b', isRelative: true }]),
        createParsedFile('/test/project/src/b.ts', [{ source: './c', isRelative: true }]),
        createParsedFile('/test/project/src/c.ts', [{ source: './a', isRelative: true }]),
      ];

      const graph = buildDependencyGraph(files, projectRoot);

      expect(graph.circularDependencies.length).toBeGreaterThan(0);
    });

    it('should not report false positives', () => {
      const files = [
        createParsedFile('/test/project/src/a.ts', [{ source: './b', isRelative: true }]),
        createParsedFile('/test/project/src/b.ts', [{ source: './c', isRelative: true }]),
        createParsedFile('/test/project/src/c.ts'),
      ];

      const graph = buildDependencyGraph(files, projectRoot);

      expect(graph.circularDependencies).toHaveLength(0);
    });
  });

  describe('metrics calculation', () => {
    it('should calculate in-degree and out-degree', () => {
      const files = [
        createParsedFile('/test/project/src/a.ts', [{ source: './shared', isRelative: true }]),
        createParsedFile('/test/project/src/b.ts', [{ source: './shared', isRelative: true }]),
        createParsedFile('/test/project/src/shared.ts'),
      ];

      const graph = buildDependencyGraph(files, projectRoot);
      const sharedNode = graph.nodes.get('src/shared.ts');

      expect(sharedNode).toBeDefined();
      expect(sharedNode!.inDegree).toBeGreaterThanOrEqual(2);
    });
  });
});
