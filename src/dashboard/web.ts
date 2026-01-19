/**
 * Web Dashboard Generator
 * Generates a static HTML dashboard for architecture visualization
 * @module dashboard/web
 */

import * as fs from 'fs';
import * as path from 'path';
import { ArchitectureAnalysis } from '../types';
import { generateHealthReport, HealthReport } from './index';

export interface WebDashboardOptions {
  /** Output file path */
  outputPath?: string;
  /** Dashboard title */
  title?: string;
  /** Include interactive features */
  interactive?: boolean;
}

/**
 * Generate a static HTML dashboard
 */
export async function generateWebDashboard(
  analysis: ArchitectureAnalysis,
  options: WebDashboardOptions = {}
): Promise<string> {
  const {
    outputPath = path.join(analysis.projectRoot, 'docs', 'dashboard.html'),
    title = 'Architecture Dashboard',
    interactive = true,
  } = options;

  const report = generateHealthReport(analysis);
  const html = generateDashboardHTML(analysis, report, title, interactive);

  // Ensure directory exists
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.promises.writeFile(outputPath, html, 'utf-8');

  return outputPath;
}

/**
 * Generate the HTML content
 */
function generateDashboardHTML(
  analysis: ArchitectureAnalysis,
  report: HealthReport,
  title: string,
  interactive: boolean
): string {
  const mermaidDiagram = generateMermaidForDashboard(analysis);
  const gradeColor = getGradeColor(report.grade);
  const statusIcon = getStatusIcon(report.status);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} | ArchPulse</title>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <style>
    :root {
      --primary: #3498db;
      --success: #2ecc71;
      --warning: #f39c12;
      --danger: #e74c3c;
      --dark: #2c3e50;
      --light: #ecf0f1;
      --grade-color: ${gradeColor};
    }
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    
    .header {
      text-align: center;
      color: white;
      margin-bottom: 30px;
    }
    
    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
    }
    
    .header p {
      opacity: 0.9;
    }
    
    .dashboard {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }
    
    .card {
      background: white;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.1);
    }
    
    .card-title {
      font-size: 1.1rem;
      color: var(--dark);
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .grade-card {
      grid-column: span 1;
      text-align: center;
    }
    
    .grade {
      font-size: 5rem;
      font-weight: bold;
      color: var(--grade-color);
      line-height: 1;
    }
    
    .score {
      font-size: 1.5rem;
      color: #666;
      margin-top: 8px;
    }
    
    .status {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 0.9rem;
      margin-top: 16px;
      background: ${report.status === 'healthy' ? '#d4edda' : report.status === 'warning' ? '#fff3cd' : '#f8d7da'};
      color: ${report.status === 'healthy' ? '#155724' : report.status === 'warning' ? '#856404' : '#721c24'};
    }
    
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }
    
    .metric {
      text-align: center;
      padding: 16px;
      background: var(--light);
      border-radius: 12px;
    }
    
    .metric-value {
      font-size: 2rem;
      font-weight: bold;
      color: var(--dark);
    }
    
    .metric-label {
      font-size: 0.85rem;
      color: #666;
      margin-top: 4px;
    }
    
    .layers-list {
      list-style: none;
    }
    
    .layer-item {
      display: flex;
      align-items: center;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 8px;
      background: var(--light);
    }
    
    .layer-color {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      margin-right: 12px;
    }
    
    .layer-name {
      flex: 1;
      font-weight: 500;
    }
    
    .layer-count {
      color: #666;
      font-size: 0.9rem;
    }
    
    .recommendations {
      list-style: none;
    }
    
    .recommendation {
      padding: 12px;
      background: #fff3cd;
      border-left: 4px solid #f39c12;
      border-radius: 4px;
      margin-bottom: 8px;
      font-size: 0.95rem;
    }
    
    .diagram-card {
      grid-column: 1 / -1;
    }
    
    .mermaid {
      display: flex;
      justify-content: center;
      overflow-x: auto;
    }
    
    .footer {
      text-align: center;
      color: white;
      opacity: 0.8;
      margin-top: 30px;
      font-size: 0.9rem;
    }
    
    .footer a {
      color: white;
    }
  </style>
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>🏗️ ${title}</h1>
      <p>Generated by ArchPulse on ${analysis.timestamp.toLocaleDateString()}</p>
    </header>
    
    <div class="dashboard">
      <!-- Grade Card -->
      <div class="card grade-card">
        <div class="card-title">📊 Health Grade</div>
        <div class="grade">${report.grade}</div>
        <div class="score">${report.metrics.score}/100</div>
        <div class="status">${statusIcon} ${capitalize(report.status)}</div>
      </div>
      
      <!-- Metrics Card -->
      <div class="card">
        <div class="card-title">📈 Metrics</div>
        <div class="metrics-grid">
          <div class="metric">
            <div class="metric-value">${analysis.filesAnalyzed}</div>
            <div class="metric-label">Files Analyzed</div>
          </div>
          <div class="metric">
            <div class="metric-value">${analysis.totalDependencies}</div>
            <div class="metric-label">Dependencies</div>
          </div>
          <div class="metric">
            <div class="metric-value">${analysis.layers.length}</div>
            <div class="metric-label">Layers</div>
          </div>
          <div class="metric">
            <div class="metric-value">${report.metrics.circularDeps}</div>
            <div class="metric-label">Circular Deps</div>
          </div>
        </div>
      </div>
      
      <!-- Layers Card -->
      <div class="card">
        <div class="card-title">🗂️ Architecture Layers</div>
        <ul class="layers-list">
          ${analysis.layers.map(layer => `
            <li class="layer-item">
              <span class="layer-color" style="background: ${layer.color}"></span>
              <span class="layer-name">${layer.name}</span>
              <span class="layer-count">${layer.modules.length} modules</span>
            </li>
          `).join('')}
        </ul>
      </div>
      
      <!-- Recommendations Card -->
      ${report.recommendations.length > 0 ? `
      <div class="card">
        <div class="card-title">💡 Recommendations</div>
        <ul class="recommendations">
          ${report.recommendations.map(rec => `
            <li class="recommendation">${rec}</li>
          `).join('')}
        </ul>
      </div>
      ` : ''}
      
      <!-- Diagram Card -->
      ${interactive ? `
      <div class="card diagram-card">
        <div class="card-title">🔗 Dependency Graph</div>
        <div class="mermaid">
${mermaidDiagram}
        </div>
      </div>
      ` : ''}
    </div>
    
    <footer class="footer">
      <p>Powered by <a href="https://github.com/ThanhNguyxn/ArchPulse" target="_blank">ArchPulse</a> v0.4.0</p>
    </footer>
  </div>
  
  <script>
    mermaid.initialize({ 
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose'
    });
  </script>
</body>
</html>`;
}

/**
 * Generate Mermaid diagram for dashboard
 */
function generateMermaidForDashboard(analysis: ArchitectureAnalysis): string {
  const lines: string[] = ['flowchart TB'];

  for (const layer of analysis.layers) {
    const layerId = sanitizeId(layer.id);
    lines.push(`  subgraph ${layerId}["${layer.name}"]`);
    
    // Limit modules shown per layer
    const modulesToShow = layer.modules.slice(0, 8);
    for (const modulePath of modulesToShow) {
      const node = analysis.graph.nodes.get(modulePath);
      if (node) {
        const nodeId = sanitizeId(modulePath);
        lines.push(`    ${nodeId}["${node.name}"]`);
      }
    }
    
    if (layer.modules.length > 8) {
      lines.push(`    ${layerId}_more["+${layer.modules.length - 8} more"]`);
    }
    
    lines.push('  end');
  }

  // Add some key edges (limit to avoid cluttering)
  const edgesToShow = analysis.graph.edges.slice(0, 20);
  for (const edge of edgesToShow) {
    const from = sanitizeId(edge.from);
    const to = sanitizeId(edge.to);
    lines.push(`  ${from} --> ${to}`);
  }

  // Add layer styles
  for (const layer of analysis.layers) {
    const layerId = sanitizeId(layer.id);
    const color = layer.color.replace('#', '');
    lines.push(`  style ${layerId} fill:#${color}20,stroke:#${color}`);
  }

  return lines.join('\n');
}

function sanitizeId(str: string): string {
  return str
    .replace(/[/\\]/g, '_')
    .replace(/\./g, '_')
    .replace(/[^a-zA-Z0-9_]/g, '')
    .replace(/^(\d)/, '_$1');
}

function getGradeColor(grade: string): string {
  if (grade.startsWith('A')) return '#2ecc71';
  if (grade.startsWith('B')) return '#27ae60';
  if (grade.startsWith('C')) return '#f39c12';
  if (grade.startsWith('D')) return '#e67e22';
  return '#e74c3c';
}

function getStatusIcon(status: string): string {
  switch (status) {
    case 'healthy': return '✅';
    case 'warning': return '⚠️';
    case 'critical': return '🔴';
    default: return '❓';
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
