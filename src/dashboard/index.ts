/**
 * Architecture Health Dashboard
 * @module dashboard
 */

import { ArchitectureAnalysis } from '../types';

export interface HealthMetrics {
  /** Overall health score (0-100) */
  score: number;
  /** Coupling score (lower is better) */
  coupling: number;
  /** Number of circular dependencies */
  circularDeps: number;
  /** Number of orphan modules (no imports/exports) */
  orphans: number;
  /** Layer violation count */
  layerViolations: number;
  /** Max in-degree (most depended-upon module) */
  maxInDegree: number;
  /** Max out-degree (module with most dependencies) */
  maxOutDegree: number;
}

export interface HealthReport {
  metrics: HealthMetrics;
  grade: string;
  status: 'healthy' | 'warning' | 'critical';
  recommendations: string[];
  generatedAt: Date;
}

/**
 * Calculate architecture health metrics
 */
export function calculateHealthMetrics(analysis: ArchitectureAnalysis): HealthMetrics {
  const { graph } = analysis;

  // Calculate coupling (average out-degree)
  let totalOutDegree = 0;
  let maxInDegree = 0;
  let maxOutDegree = 0;
  let orphans = 0;

  for (const node of graph.nodes.values()) {
    totalOutDegree += node.outDegree;
    maxInDegree = Math.max(maxInDegree, node.inDegree);
    maxOutDegree = Math.max(maxOutDegree, node.outDegree);

    if (node.inDegree === 0 && node.outDegree === 0) {
      orphans++;
    }
  }

  const coupling = graph.nodes.size > 0 ? totalOutDegree / graph.nodes.size : 0;
  const circularDeps = graph.circularDependencies.length;
  const layerViolations = countLayerViolations(analysis);

  const score = calculateOverallScore({
    coupling,
    circularDeps,
    orphans,
    layerViolations,
    maxInDegree,
    maxOutDegree,
  });

  return {
    score,
    coupling: Math.round(coupling * 100) / 100,
    circularDeps,
    orphans,
    layerViolations,
    maxInDegree,
    maxOutDegree,
  };
}

/**
 * Generate health report with recommendations
 */
export function generateHealthReport(analysis: ArchitectureAnalysis): HealthReport {
  const metrics = calculateHealthMetrics(analysis);
  const grade = scoreToGrade(metrics.score);
  const status = getStatus(metrics.score);
  const recommendations = generateRecommendations(metrics);

  return {
    metrics,
    grade,
    status,
    recommendations,
    generatedAt: new Date(),
  };
}

/**
 * Count layer violations
 */
function countLayerViolations(analysis: ArchitectureAnalysis): number {
  let violations = 0;
  const layerOrder = new Map<string, number>();

  analysis.layers.forEach((layer, index) => {
    layer.modules.forEach(mod => {
      layerOrder.set(mod, index);
    });
  });

  for (const edge of analysis.graph.edges) {
    const fromLayer = layerOrder.get(edge.from);
    const toLayer = layerOrder.get(edge.to);

    if (fromLayer !== undefined && toLayer !== undefined && fromLayer > toLayer) {
      violations++;
    }
  }

  return violations;
}

/**
 * Calculate overall health score
 */
function calculateOverallScore(metrics: Omit<HealthMetrics, 'score'>): number {
  let score = 100;

  score -= metrics.circularDeps * 15;
  if (metrics.coupling > 5) score -= 10;
  if (metrics.coupling > 10) score -= 15;
  score -= metrics.orphans * 2;
  score -= metrics.layerViolations * 5;
  if (metrics.maxInDegree > 20) score -= 10;
  if (metrics.maxOutDegree > 20) score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreToGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

function getStatus(score: number): 'healthy' | 'warning' | 'critical' {
  if (score >= 70) return 'healthy';
  if (score >= 50) return 'warning';
  return 'critical';
}

function generateRecommendations(metrics: HealthMetrics): string[] {
  const recs: string[] = [];

  if (metrics.circularDeps > 0) {
    recs.push(`Fix ${metrics.circularDeps} circular dependency chain(s)`);
  }
  if (metrics.coupling > 10) {
    recs.push('High coupling - consider breaking down large modules');
  }
  if (metrics.orphans > 0) {
    recs.push(`${metrics.orphans} orphan module(s) found`);
  }
  if (metrics.layerViolations > 0) {
    recs.push(`${metrics.layerViolations} layer violation(s)`);
  }
  if (metrics.maxInDegree > 20) {
    recs.push('Some modules have too many dependents');
  }
  if (metrics.maxOutDegree > 20) {
    recs.push('Some modules depend on too many others');
  }

  if (recs.length === 0) {
    recs.push('Architecture looks healthy!');
  }

  return recs;
}

// Re-export web dashboard
export * from './web';
