/**
 * Unit tests for generators
 */

import { ArchitectureAnalysis, DependencyGraph, ArchitectureLayer, DependencyNode } from '../types';
import { generateDrawioXml } from './drawio';
import { generateLayout } from './layout';

// Helper to create a mock analysis
function createMockAnalysis(
  nodeCount: number = 3,
  layerCount: number = 2
): ArchitectureAnalysis {
  const nodes = new Map<string, DependencyNode>();
  const edges = [];
  const layers: ArchitectureLayer[] = [];

  // Create nodes
  for (let i = 0; i < nodeCount; i++) {
    const path = `src/module${i}.ts`;
    nodes.set(path, {
      path,
      name: `module${i}`,
      inDegree: i > 0 ? 1 : 0,
      outDegree: i < nodeCount - 1 ? 1 : 0,
      coupling: 0.3,
      isEntryPoint: i === 0,
      language: 'typescript',
    });
  }

  // Create edges
  for (let i = 0; i < nodeCount - 1; i++) {
    edges.push({
      from: `src/module${i}.ts`,
      to: `src/module${i + 1}.ts`,
      weight: 1,
      importTypes: ['es6-named'] as ('es6-named')[],
    });
  }

  // Create layers
  const modulesPerLayer = Math.ceil(nodeCount / layerCount);
  for (let i = 0; i < layerCount; i++) {
    const layerModules: string[] = [];
    for (let j = 0; j < modulesPerLayer; j++) {
      const idx = i * modulesPerLayer + j;
      if (idx < nodeCount) {
        layerModules.push(`src/module${idx}.ts`);
      }
    }
    layers.push({
      id: `layer${i}`,
      name: `Layer ${i}`,
      modules: layerModules,
      color: i === 0 ? '#3498db' : '#2ecc71',
      level: i,
    });
  }

  const graph: DependencyGraph = {
    nodes,
    edges,
    externalDependencies: new Set(['lodash', 'react']),
    circularDependencies: [],
  };

  return {
    projectRoot: '/test/project',
    graph,
    layers,
    timestamp: new Date(),
    filesAnalyzed: nodeCount,
    totalDependencies: edges.length,
    metrics: {
      averageCoupling: 0.3,
      highCouplingModules: [],
      circularDependencyCount: 0,
      orphanModules: [],
      entryPointsCount: 1,
    },
  };
}

describe('Draw.io Generator', () => {
  describe('generateDrawioXml()', () => {
    it('should generate valid XML', () => {
      const analysis = createMockAnalysis();
      const xml = generateDrawioXml(analysis);

      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<mxfile');
      expect(xml).toContain('</mxfile>');
    });

    it('should include diagram title', () => {
      const analysis = createMockAnalysis();
      const xml = generateDrawioXml(analysis, { title: 'My Architecture' });

      expect(xml).toContain('My Architecture');
    });

    it('should create cells for layers', () => {
      const analysis = createMockAnalysis(4, 2);
      const xml = generateDrawioXml(analysis);

      expect(xml).toContain('Layer 0');
      expect(xml).toContain('Layer 1');
    });

    it('should create cells for modules', () => {
      const analysis = createMockAnalysis(3, 1);
      const xml = generateDrawioXml(analysis);

      expect(xml).toContain('module0');
      expect(xml).toContain('module1');
      expect(xml).toContain('module2');
    });

    it('should handle empty analysis', () => {
      const analysis = createMockAnalysis(0, 0);
      const xml = generateDrawioXml(analysis);

      expect(xml).toContain('<?xml version="1.0"');
      expect(xml).toContain('<mxfile');
    });

    it('should include mxCell elements', () => {
      const analysis = createMockAnalysis();
      const xml = generateDrawioXml(analysis);

      expect(xml).toContain('<mxCell');
      expect(xml).toContain('</mxCell>');
    });
  });
});

describe('Layout Engine', () => {
  describe('generateLayout()', () => {
    it('should generate layout with correct node count', () => {
      const analysis = createMockAnalysis(5, 2);
      const layout = generateLayout(analysis);

      // Should have 2 layer groups + 5 module nodes
      expect(layout.nodes.length).toBe(7);
    });

    it('should generate edges for dependencies', () => {
      const analysis = createMockAnalysis(3, 1);
      const layout = generateLayout(analysis);

      // 3 nodes create 2 edges (0->1, 1->2)
      expect(layout.edges.length).toBe(2);
    });

    it('should calculate canvas dimensions', () => {
      const analysis = createMockAnalysis(5, 2);
      const layout = generateLayout(analysis);

      expect(layout.width).toBeGreaterThan(0);
      expect(layout.height).toBeGreaterThan(0);
    });

    it('should position layers vertically', () => {
      const analysis = createMockAnalysis(4, 2);
      const layout = generateLayout(analysis);

      const layerNodes = layout.nodes.filter(n => n.isGroup);
      expect(layerNodes.length).toBe(2);

      // Second layer should be below first
      const layer0 = layerNodes.find(n => n.label === 'Layer 0');
      const layer1 = layerNodes.find(n => n.label === 'Layer 1');

      expect(layer0).toBeDefined();
      expect(layer1).toBeDefined();
      expect(layer1!.position.y).toBeGreaterThan(layer0!.position.y);
    });

    it('should assign parent IDs to module nodes', () => {
      const analysis = createMockAnalysis(3, 1);
      const layout = generateLayout(analysis);

      const moduleNodes = layout.nodes.filter(n => !n.isGroup);
      expect(moduleNodes.length).toBe(3);

      // All modules should have a parent (layer)
      moduleNodes.forEach(node => {
        expect(node.parentId).toBeDefined();
      });
    });

    it('should handle empty analysis', () => {
      const analysis = createMockAnalysis(0, 0);
      const layout = generateLayout(analysis);

      expect(layout.nodes.length).toBe(0);
      expect(layout.edges.length).toBe(0);
    });

    it('should track layer bounds', () => {
      const analysis = createMockAnalysis(4, 2);
      const layout = generateLayout(analysis);

      expect(layout.layerBounds.size).toBe(2);
      expect(layout.layerBounds.has('layer0')).toBe(true);
      expect(layout.layerBounds.has('layer1')).toBe(true);
    });
  });
});
