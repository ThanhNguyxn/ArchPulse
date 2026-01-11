/**
 * File scanner for discovering source files
 * @module analyzers/scanner
 */

import * as fs from 'fs';
import * as path from 'path';
import fg from 'fast-glob';
import { ArchPulseConfig } from '../types';
import { debug, bullet } from '../utils/logger';
import { getSupportedExtensions } from '../parsers';

/**
 * Options for file scanning
 */
export interface ScanOptions {
  /** Root directory to scan */
  root: string;
  /** Patterns to ignore */
  ignore: string[];
  /** File extensions to include */
  extensions: string[];
  /** Maximum depth to scan (-1 for unlimited) */
  maxDepth?: number;
}

/**
 * Result of a file scan
 */
export interface ScanResult {
  /** All discovered files (absolute paths) */
  files: string[];
  /** Total number of files */
  totalFiles: number;
  /** Files by extension */
  byExtension: Map<string, number>;
  /** Directories discovered */
  directories: Set<string>;
  /** Scan duration in ms */
  duration: number;
}

/**
 * Scan a directory for source files
 */
export async function scanDirectory(options: ScanOptions): Promise<ScanResult> {
  const startTime = Date.now();
  const { root, ignore, extensions } = options;

  debug(`Scanning directory: ${root}`);
  debug(`Extensions: ${extensions.join(', ')}`);
  debug(`Ignore patterns: ${ignore.join(', ')}`);

  // Build glob pattern for file extensions
  const extPattern =
    extensions.length > 1 ? `**/*{${extensions.join(',')}}` : `**/*${extensions[0]}`;

  // Normalize paths for fast-glob (use forward slashes)
  const normalizedRoot = root.replace(/\\/g, '/');
  const normalizedIgnore = ignore.map(p => p.replace(/\\/g, '/'));

  // Find all matching files
  const files = await fg(extPattern, {
    cwd: normalizedRoot,
    absolute: true,
    ignore: normalizedIgnore,
    onlyFiles: true,
    followSymbolicLinks: false,
    deep: options.maxDepth ?? Infinity,
  });

  // Collect statistics
  const byExtension = new Map<string, number>();
  const directories = new Set<string>();

  for (const file of files) {
    // Count by extension
    const ext = path.extname(file).toLowerCase();
    byExtension.set(ext, (byExtension.get(ext) || 0) + 1);

    // Track directories
    const dir = path.dirname(file);
    directories.add(dir);
  }

  const duration = Date.now() - startTime;

  debug(`Found ${files.length} files in ${duration}ms`);

  return {
    files,
    totalFiles: files.length,
    byExtension,
    directories,
    duration,
  };
}

/**
 * Scan using ArchPulse configuration
 */
export async function scanWithConfig(
  projectRoot: string,
  config: ArchPulseConfig
): Promise<ScanResult> {
  const supportedExtensions = getSupportedExtensions();

  // Filter configured extensions by what parsers support
  const extensions = config.extensions.filter(ext => supportedExtensions.includes(ext));

  return scanDirectory({
    root: projectRoot,
    ignore: config.ignore,
    extensions,
  });
}

/**
 * Get directory structure as a tree
 */
export function getDirectoryTree(root: string, files: string[]): Map<string, string[]> {
  const tree = new Map<string, string[]>();
  const normalizedRoot = root.replace(/\\/g, '/');

  for (const file of files) {
    const normalizedFile = file.replace(/\\/g, '/');
    const relativePath = normalizedFile.startsWith(normalizedRoot)
      ? normalizedFile.slice(normalizedRoot.length + 1)
      : normalizedFile;

    const dir = path.dirname(relativePath);
    const normalizedDir = dir === '.' ? '' : dir.replace(/\\/g, '/');

    if (!tree.has(normalizedDir)) {
      tree.set(normalizedDir, []);
    }
    tree.get(normalizedDir)!.push(path.basename(file));
  }

  return tree;
}

/**
 * Read file content safely
 */
export async function readFileContent(filePath: string): Promise<string | null> {
  try {
    return await fs.promises.readFile(filePath, 'utf-8');
  } catch (err) {
    debug(`Failed to read file: ${filePath}`);
    return null;
  }
}

/**
 * Check if a path exists and is a directory
 */
export function isDirectory(dirPath: string): boolean {
  try {
    return fs.statSync(dirPath).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Get file size in bytes
 */
export function getFileSize(filePath: string): number {
  try {
    return fs.statSync(filePath).size;
  } catch {
    return 0;
  }
}

/**
 * Find the project root by looking for common markers
 */
export function findProjectRoot(startPath: string): string {
  const markers = ['package.json', 'pyproject.toml', 'setup.py', 'go.mod', 'Cargo.toml', '.git'];

  let current = path.resolve(startPath);

  while (current !== path.dirname(current)) {
    for (const marker of markers) {
      if (fs.existsSync(path.join(current, marker))) {
        return current;
      }
    }
    current = path.dirname(current);
  }

  // Fallback to start path
  return path.resolve(startPath);
}

/**
 * Print scan summary
 */
export function printScanSummary(result: ScanResult): void {
  bullet(`Total files: ${result.totalFiles}`);
  bullet(`Directories: ${result.directories.size}`);
  bullet(`Scan time: ${result.duration}ms`);

  if (result.byExtension.size > 0) {
    bullet('By extension:');
    for (const [ext, count] of result.byExtension) {
      bullet(`${ext}: ${count}`, 1);
    }
  }
}
