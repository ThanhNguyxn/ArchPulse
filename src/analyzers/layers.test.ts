/**
 * Unit tests for layer detector
 */

import { detectLayers, groupByDirectory } from './layers';
import { DependencyGraph, ArchPulseConfig, DependencyNode, DependencyEdge } from '../types';
import { DEFAULT_CONFIG } from '../config/loader';

// Helper to create a mock dependency graph
function createMockGraph(files: string[]): DependencyGraph {
  const nodes = new Map<string, DependencyNode>();
  const edges: DependencyEdge[] = [];

  for (const file of files) {
    nodes.set(file, {
      path: file,
      name: file.split('/').pop() || file,
      inDegree: 0,
      outDegree: 0,
      coupling: 0,
      isEntryPoint: false,
      language: 'typescript',
    });
  }

  return {
    nodes,
    edges,
    externalDependencies: new Set<string>(),
    circularDependencies: [],
  };
}

describe('Layer Detection', () => {
  describe('detectLayers()', () => {
    it('should detect controller/api layer', () => {
      const graph = createMockGraph([
        'src/controllers/userController.ts',
        'src/controllers/productController.ts',
      ]);

      const layers = detectLayers(graph, DEFAULT_CONFIG);

      expect(layers.some(l => l.id === 'api')).toBe(true);
    });

    it('should detect service layer', () => {
      const graph = createMockGraph([
        'src/services/userService.ts',
        'src/services/emailService.ts',
      ]);

      const layers = detectLayers(graph, DEFAULT_CONFIG);

      expect(layers.some(l => l.id === 'services')).toBe(true);
    });

    it('should detect database/model layer', () => {
      const graph = createMockGraph(['src/models/User.ts', 'src/models/Product.ts']);

      const layers = detectLayers(graph, DEFAULT_CONFIG);

      expect(layers.some(l => l.id === 'database')).toBe(true);
    });

    it('should detect shared/utils layer', () => {
      const graph = createMockGraph(['src/utils/helpers.ts', 'src/utils/date.ts']);

      const layers = detectLayers(graph, DEFAULT_CONFIG);

      expect(layers.some(l => l.id === 'shared')).toBe(true);
    });

    it('should group files within layers', () => {
      const graph = createMockGraph([
        'src/controllers/userController.ts',
        'src/controllers/productController.ts',
        'src/controllers/orderController.ts',
      ]);

      const layers = detectLayers(graph, DEFAULT_CONFIG);
      const apiLayer = layers.find(l => l.id === 'api');

      expect(apiLayer).toBeDefined();
      expect(apiLayer!.modules.length).toBe(3);
    });

    it('should assign colors to layers', () => {
      const graph = createMockGraph(['src/api/routes.ts']);

      const layers = detectLayers(graph, DEFAULT_CONFIG);
      const apiLayer = layers.find(l => l.id === 'api');

      expect(apiLayer?.color).toBeDefined();
      expect(apiLayer?.color).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });

  describe('groupByDirectory()', () => {
    it('should group modules by parent directory', () => {
      const graph = createMockGraph([
        'src/controllers/user.ts',
        'src/controllers/product.ts',
        'src/services/user.ts',
      ]);

      const groups = groupByDirectory(graph);

      expect(groups.has('src/controllers')).toBe(true);
      expect(groups.get('src/controllers')?.length).toBe(2);
    });

    it('should handle empty graph', () => {
      const graph = createMockGraph([]);

      const groups = groupByDirectory(graph);

      expect(groups.size).toBe(0);
    });
  });
});
