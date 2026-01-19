/**
 * File watcher for auto-regenerating diagrams
 * @module cli/watcher
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadConfig } from '../config/loader';
import { getSupportedExtensions } from '../parsers';
import { info, success, warn, debug } from '../utils/logger';

export interface WatcherOptions {
  /** Project root directory */
  projectRoot: string;
  /** Config file path */
  configPath?: string;
  /** Callback when files change */
  onFileChange: (changedFiles: string[]) => Promise<void>;
  /** Debounce time in ms */
  debounceMs?: number;
}

interface WatcherState {
  watcher: fs.FSWatcher | null;
  isRunning: boolean;
  pendingFiles: Set<string>;
  debounceTimer: NodeJS.Timeout | null;
}

/**
 * Create a file watcher for the project
 */
export function createWatcher(options: WatcherOptions): {
  start: () => void;
  stop: () => void;
} {
  const { projectRoot, configPath, onFileChange, debounceMs = 500 } = options;

  const state: WatcherState = {
    watcher: null,
    isRunning: false,
    pendingFiles: new Set(),
    debounceTimer: null,
  };

  const config = loadConfig(projectRoot, configPath);
  const supportedExtensions = new Set(getSupportedExtensions());

  /**
   * Check if a file should be watched
   */
  function shouldWatch(filePath: string): boolean {
    const ext = path.extname(filePath);
    if (!supportedExtensions.has(ext)) {
      return false;
    }

    // Check if file is in ignored patterns
    const relativePath = path.relative(projectRoot, filePath);
    for (const ignorePattern of config.ignore) {
      if (matchesPattern(relativePath, ignorePattern)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Simple glob pattern matching
   */
  function matchesPattern(filePath: string, pattern: string): boolean {
    // Normalize path separators
    const normalizedPath = filePath.replace(/\\/g, '/');
    const normalizedPattern = pattern.replace(/\\/g, '/');

    // Convert glob to regex
    let regexPattern = normalizedPattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '<<<DOUBLE_STAR>>>')
      .replace(/\*/g, '[^/]*')
      .replace(/<<<DOUBLE_STAR>>>/g, '.*');

    // Add anchors
    if (!regexPattern.startsWith('.*')) {
      regexPattern = '^' + regexPattern;
    }
    if (!regexPattern.endsWith('.*')) {
      regexPattern = regexPattern + '$';
    }

    try {
      return new RegExp(regexPattern).test(normalizedPath);
    } catch {
      return false;
    }
  }

  /**
   * Handle file change events
   */
  function handleFileChange(eventType: string, filename: string | null): void {
    if (!filename) return;

    const fullPath = path.join(projectRoot, filename);

    // Skip if not a supported file
    if (!shouldWatch(fullPath)) {
      return;
    }

    debug(`File ${eventType}: ${filename}`);
    state.pendingFiles.add(fullPath);

    // Debounce the callback
    if (state.debounceTimer) {
      clearTimeout(state.debounceTimer);
    }

    state.debounceTimer = setTimeout(async () => {
      const changedFiles = Array.from(state.pendingFiles);
      state.pendingFiles.clear();

      if (changedFiles.length > 0) {
        info('');
        info(`📁 Detected ${changedFiles.length} file change(s)...`);

        try {
          await onFileChange(changedFiles);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          warn(`Regeneration failed: ${message}`);
        }
      }
    }, debounceMs);
  }

  /**
   * Start watching for file changes
   */
  function start(): void {
    if (state.isRunning) {
      warn('Watcher is already running');
      return;
    }

    try {
      // Use recursive watch (Node.js 10+)
      state.watcher = fs.watch(
        projectRoot,
        { recursive: true },
        (eventType, filename) => handleFileChange(eventType, filename)
      );

      state.isRunning = true;
      info('');
      success('👁️  Watch mode enabled. Waiting for file changes...');
      info(`   Watching: ${projectRoot}`);
      info('   Press Ctrl+C to stop');
      info('');

      // Handle watcher errors
      state.watcher.on('error', (err: Error) => {
        warn(`Watcher error: ${err.message}`);
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      warn(`Failed to start watcher: ${message}`);
    }
  }

  /**
   * Stop watching
   */
  function stop(): void {
    if (!state.isRunning) {
      return;
    }

    if (state.debounceTimer) {
      clearTimeout(state.debounceTimer);
      state.debounceTimer = null;
    }

    if (state.watcher) {
      state.watcher.close();
      state.watcher = null;
    }

    state.isRunning = false;
    state.pendingFiles.clear();

    info('');
    info('👋 Watch mode stopped');
  }

  return { start, stop };
}

/**
 * Run generate in watch mode
 */
export async function runWatchMode(
  generateFn: () => Promise<{ success: boolean }>,
  options: Omit<WatcherOptions, 'onFileChange'>
): Promise<void> {
  const watcher = createWatcher({
    ...options,
    onFileChange: async () => {
      await generateFn();
    },
  });

  // Handle process termination
  process.on('SIGINT', () => {
    watcher.stop();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    watcher.stop();
    process.exit(0);
  });

  // Initial generation
  await generateFn();

  // Start watching
  watcher.start();

  // Keep the process alive
  await new Promise(() => {
    // This promise never resolves - keeps the process running
  });
}
