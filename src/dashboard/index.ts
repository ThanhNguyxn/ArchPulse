/**
 * Architecture Health Dashboard
 * @module dashboard
 */

import { ArchitectureAnalysis } from '../types';

export interface HealthMetrics {
  /** Overall health score (0-100) */
  score: number;
  /** Average coupling score (average out-degree, lower is better) */
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
  /** Afferent Coupling - total inbound dependencies (Robert C. Martin) */
  afferentCoupling: number;
  /** Efferent Coupling - total outbound dependencies (Robert C. Martin) */
  efferentCoupling: number;
  /** Instability Index: I = Ce / (Ca + Ce), range 0-1 (Robert C. Martin) */
  instability: number;
  /** Number of hub modules (both high Ca and Ce) */
  hubModules: number;
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
 * Based on Robert C. Martin's package metrics and industry best practices
 */
export function calculateHealthMetrics(analysis: ArchitectureAnalysis): HealthMetrics {
  const { graph } = analysis;

  // Calculate coupling metrics (Robert C. Martin style)
  let totalOutDegree = 0;  // Total Ce (Efferent Coupling)
  let totalInDegree = 0;   // Total Ca (Afferent Coupling)
  let maxInDegree = 0;
  let maxOutDegree = 0;
  let orphans = 0;
  let hubModules = 0;

  // Thresholds for hub detection
  const HUB_THRESHOLD = 5;

  for (const node of graph.nodes.values()) {
    totalOutDegree += node.outDegree;
    totalInDegree += node.inDegree;
    maxInDegree = Math.max(maxInDegree, node.inDegree);
    maxOutDegree = Math.max(maxOutDegree, node.outDegree);

    // Orphan: no connections at all
    if (node.inDegree === 0 && node.outDegree === 0) {
      orphans++;
    }

    // Hub: module with both high incoming and outgoing dependencies
    if (node.inDegree >= HUB_THRESHOLD && node.outDegree >= HUB_THRESHOLD) {
      hubModules++;
    }
  }

  // Average coupling (out-degree per module)
  const coupling = graph.nodes.size > 0 ? totalOutDegree / graph.nodes.size : 0;
  const circularDeps = graph.circularDependencies.length;
  const layerViolations = countLayerViolations(analysis);

  // Calculate Instability Index: I = Ce / (Ca + Ce)
  // I = 0 means completely stable (many dependents, few dependencies)
  // I = 1 means completely unstable (few dependents, many dependencies)
  const totalCoupling = totalInDegree + totalOutDegree;
  const instability = totalCoupling > 0 
    ? Math.round((totalOutDegree / totalCoupling) * 100) / 100 
    : 0;

  const score = calculateOverallScore({
    coupling,
    circularDeps,
    orphans,
    layerViolations,
    maxInDegree,
    maxOutDegree,
    afferentCoupling: totalInDegree,
    efferentCoupling: totalOutDegree,
    instability,
    hubModules,
  }, graph.nodes.size);

  return {
    score,
    coupling: Math.round(coupling * 100) / 100,
    circularDeps,
    orphans,
    layerViolations,
    maxInDegree,
    maxOutDegree,
    afferentCoupling: totalInDegree,
    efferentCoupling: totalOutDegree,
    instability,
    hubModules,
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
 * Calculate overall health score (adjusted for large codebases)
 * Based on industry standard metrics and best practices
 */
function calculateOverallScore(metrics: Omit<HealthMetrics, 'score'>, totalModules: number = 1): number {
  let score = 100;

  // Circular dependencies penalty (max -30) - Most critical issue
  const circularPenalty = Math.min(30, metrics.circularDeps * 3);
  score -= circularPenalty;

  // Coupling penalty based on average (max -20)
  if (metrics.coupling > 5) score -= 5;
  if (metrics.coupling > 10) score -= 10;
  if (metrics.coupling > 20) score -= 5;

  // Orphan penalty - use percentage instead of absolute (max -15)
  const orphanPercentage = totalModules > 0 ? (metrics.orphans / totalModules) * 100 : 0;
  if (orphanPercentage > 50) score -= 15;
  else if (orphanPercentage > 30) score -= 10;
  else if (orphanPercentage > 10) score -= 5;

  // Layer violations penalty (max -15)
  const violationPenalty = Math.min(15, metrics.layerViolations);
  score -= violationPenalty;

  // High coupling modules penalty (max -10)
  if (metrics.maxInDegree > 50) score -= 5;
  if (metrics.maxOutDegree > 50) score -= 5;

  // Hub modules penalty (max -5) - modules that are both stable and unstable
  if (metrics.hubModules > 3) score -= 5;
  else if (metrics.hubModules > 0) score -= 2;

  // Instability balance check (max -5)
  // Ideal is to have a mix of stable (I~0) and unstable (I~1) modules
  // If overall instability is around 0.5, it's balanced
  // Extreme values (near 0 or 1) can indicate architectural issues
  if (metrics.instability > 0.9 || metrics.instability < 0.1) {
    score -= 3;
  }

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
    recs.push(`Fix ${metrics.circularDeps} circular dependency chain(s) - highest priority`);
  }
  if (metrics.coupling > 10) {
    recs.push('High average coupling - consider breaking down large modules');
  }
  if (metrics.orphans > 0) {
    recs.push(`${metrics.orphans} orphan module(s) - consider removing or integrating`);
  }
  if (metrics.layerViolations > 0) {
    recs.push(`${metrics.layerViolations} layer violation(s) - fix dependency direction`);
  }
  if (metrics.maxInDegree > 20) {
    recs.push(`High afferent coupling (Ca=${metrics.maxInDegree}) - some modules are depended on too much`);
  }
  if (metrics.maxOutDegree > 20) {
    recs.push(`High efferent coupling (Ce=${metrics.maxOutDegree}) - some modules depend on too many others`);
  }
  if (metrics.hubModules > 0) {
    recs.push(`${metrics.hubModules} hub module(s) with high coupling in both directions`);
  }
  if (metrics.instability > 0.8) {
    recs.push(`High instability (I=${metrics.instability}) - codebase is very volatile`);
  } else if (metrics.instability < 0.2) {
    recs.push(`Low instability (I=${metrics.instability}) - codebase may be too rigid`);
  }

  if (recs.length === 0) {
    recs.push('Architecture looks healthy! Well-balanced coupling and dependencies.');
  }

  return recs;
}

// Re-export web dashboard
export * from './web';
