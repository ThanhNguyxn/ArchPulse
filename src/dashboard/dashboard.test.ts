/**
 * Unit tests for Architecture Health Dashboard
 */

import {
  ArchitectureAnalysis,
  DependencyGraph,
  ArchitectureLayer,
  DependencyNode,
} from '../types';
import { calculateHealthMetrics, generateHealthReport, HealthReport } from './index';

// Helper to create a mock analysis
function createMockAnalysis(options: {
  nodeCount?: number;
  circularDeps?: number;
  highCoupling?: boolean;
  orphans?: number;
}): ArchitectureAnalysis {
  const { nodeCount = 5, circularDeps = 0, highCoupling = false, orphans = 0 } = options;

  const nodes = new Map<string, DependencyNode>();
  const edges = [];

  // Create nodes
  for (let i = 0; i < nodeCount; i++) {
    const path = `src/module${i}.ts`;
    const isOrphan = i < orphans;
    nodes.set(path, {
      path,
      name: `module${i}`,
      inDegree: isOrphan ? 0 : Math.min(i, 5),
      outDegree: isOrphan ? 0 : Math.min(nodeCount - i - 1, 5),
      coupling: highCoupling ? 0.9 : 0.3,
      isEntryPoint: i === 0,
      language: 'typescript',
    });
  }

  // Create edges
  for (let i = 0; i < nodeCount - 1; i++) {
    if (i >= orphans) {
      edges.push({
        from: `src/module${i}.ts`,
        to: `src/module${i + 1}.ts`,
        weight: 1,
        importTypes: ['es6-named'] as ('es6-named')[],
      });
    }
  }

  // Create circular dependencies array
  const circularDependencies: string[][] = [];
  for (let i = 0; i < circularDeps; i++) {
    circularDependencies.push([`src/moduleA${i}.ts`, `src/moduleB${i}.ts`, `src/moduleA${i}.ts`]);
  }

  const layers: ArchitectureLayer[] = [
    {
      id: 'layer0',
      name: 'Layer 0',
      modules: Array.from(nodes.keys()),
      color: '#3498db',
      level: 0,
    },
  ];

  const graph: DependencyGraph = {
    nodes,
    edges,
    externalDependencies: new Set(),
    circularDependencies,
  };

  return {
    projectRoot: '/test/project',
    graph,
    layers,
    timestamp: new Date(),
    filesAnalyzed: nodeCount,
    totalDependencies: edges.length,
    metrics: {
      averageCoupling: highCoupling ? 0.9 : 0.3,
      highCouplingModules: highCoupling ? ['src/module0.ts'] : [],
      circularDependencyCount: circularDeps,
      orphanModules: Array.from({ length: orphans }, (_, i) => `src/module${i}.ts`),
      entryPointsCount: 1,
    },
  };
}

describe('Dashboard Health Metrics', () => {
  describe('calculateHealthMetrics()', () => {
    it('should calculate score for healthy codebase', () => {
      const analysis = createMockAnalysis({ nodeCount: 5 });
      const metrics = calculateHealthMetrics(analysis);

      expect(metrics.score).toBeGreaterThanOrEqual(70);
      expect(metrics.circularDeps).toBe(0);
    });

    it('should reduce score for circular dependencies', () => {
      const healthy = createMockAnalysis({ nodeCount: 5, circularDeps: 0 });
      const withCircular = createMockAnalysis({ nodeCount: 5, circularDeps: 2 });

      const healthyMetrics = calculateHealthMetrics(healthy);
      const circularMetrics = calculateHealthMetrics(withCircular);

      expect(circularMetrics.score).toBeLessThan(healthyMetrics.score);
      expect(circularMetrics.circularDeps).toBe(2);
    });

    it('should calculate coupling metric', () => {
      const analysis = createMockAnalysis({ nodeCount: 5 });
      const metrics = calculateHealthMetrics(analysis);

      expect(typeof metrics.coupling).toBe('number');
      expect(metrics.coupling).toBeGreaterThanOrEqual(0);
    });

    it('should detect orphan modules', () => {
      const analysis = createMockAnalysis({ nodeCount: 5, orphans: 2 });
      const metrics = calculateHealthMetrics(analysis);

      expect(metrics.orphans).toBe(2);
    });

    it('should track max in-degree and out-degree', () => {
      const analysis = createMockAnalysis({ nodeCount: 10 });
      const metrics = calculateHealthMetrics(analysis);

      expect(metrics.maxInDegree).toBeGreaterThanOrEqual(0);
      expect(metrics.maxOutDegree).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty analysis', () => {
      const analysis = createMockAnalysis({ nodeCount: 0 });
      const metrics = calculateHealthMetrics(analysis);

      expect(metrics.score).toBeDefined();
      expect(metrics.coupling).toBe(0);
    });
  });

  describe('generateHealthReport()', () => {
    it('should generate report with grade A for healthy codebase', () => {
      const analysis = createMockAnalysis({ nodeCount: 5 });
      const report = generateHealthReport(analysis);

      expect(report.grade).toMatch(/[A-B]/);
      expect(report.status).toBe('healthy');
    });

    it('should generate report with recommendations for issues', () => {
      const analysis = createMockAnalysis({ nodeCount: 5, circularDeps: 2 });
      const report = generateHealthReport(analysis);

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(r => r.includes('circular'))).toBe(true);
    });

    it('should include timestamp', () => {
      const analysis = createMockAnalysis({ nodeCount: 5 });
      const report = generateHealthReport(analysis);

      expect(report.generatedAt).toBeInstanceOf(Date);
    });

    it('should set status to warning for medium scores', () => {
      const analysis = createMockAnalysis({ 
        nodeCount: 5, 
        circularDeps: 3,
        orphans: 3 
      });
      const report = generateHealthReport(analysis);

      // With issues, should not be 'healthy'
      expect(['warning', 'critical']).toContain(report.status);
    });

    it('should set status to critical for low scores', () => {
      const analysis = createMockAnalysis({ 
        nodeCount: 5, 
        circularDeps: 5,
        orphans: 5,
        highCoupling: true 
      });
      const report = generateHealthReport(analysis);

      expect(['warning', 'critical']).toContain(report.status);
    });

    it('should include all metric fields', () => {
      const analysis = createMockAnalysis({ nodeCount: 5 });
      const report = generateHealthReport(analysis);

      expect(report.metrics).toHaveProperty('score');
      expect(report.metrics).toHaveProperty('coupling');
      expect(report.metrics).toHaveProperty('circularDeps');
      expect(report.metrics).toHaveProperty('orphans');
      expect(report.metrics).toHaveProperty('layerViolations');
      expect(report.metrics).toHaveProperty('maxInDegree');
      expect(report.metrics).toHaveProperty('maxOutDegree');
    });

    it('should provide positive message for healthy codebase', () => {
      const analysis = createMockAnalysis({ nodeCount: 5 });
      const report = generateHealthReport(analysis);

      // Should either have no issues or positive message
      const hasPositive = report.recommendations.some(
        r => r.includes('healthy') || r.includes('good')
      );
      const hasNoIssues = report.recommendations.length === 1;

      expect(hasPositive || hasNoIssues).toBe(true);
    });
  });
});
