/**
 * Logging utilities with colored output
 * @module utils/logger
 */

import chalk from 'chalk';

/**
 * Log levels
 */
export type LogLevel = 'debug' | 'info' | 'success' | 'warn' | 'error';

/**
 * Logger configuration
 */
export interface LoggerConfig {
  /** Enable verbose/debug output */
  verbose: boolean;
  /** Enable colored output */
  colors: boolean;
  /** Prefix for all messages */
  prefix: string;
}

const defaultConfig: LoggerConfig = {
  verbose: false,
  colors: true,
  prefix: '🏗️  ArchPulse',
};

let config: LoggerConfig = { ...defaultConfig };

/**
 * Configure the logger
 */
export function configureLogger(options: Partial<LoggerConfig>): void {
  config = { ...config, ...options };
}

/**
 * Format a message with optional prefix
 */
function formatMessage(message: string, showPrefix = true): string {
  if (showPrefix && config.prefix) {
    return `${config.prefix} ${message}`;
  }
  return message;
}

/**
 * Log a debug message (only shown in verbose mode)
 */
export function debug(message: string, ...args: unknown[]): void {
  if (!config.verbose) return;
  const formatted = formatMessage(message);
  if (config.colors) {
    console.log(chalk.gray(formatted), ...args);
  } else {
    console.log(`[DEBUG] ${formatted}`, ...args);
  }
}

/**
 * Log an info message
 */
export function info(message: string, ...args: unknown[]): void {
  const formatted = formatMessage(message);
  if (config.colors) {
    console.log(chalk.blue(formatted), ...args);
  } else {
    console.log(`[INFO] ${formatted}`, ...args);
  }
}

/**
 * Log a success message
 */
export function success(message: string, ...args: unknown[]): void {
  const formatted = formatMessage(message);
  if (config.colors) {
    console.log(chalk.green('✅ ' + formatted), ...args);
  } else {
    console.log(`[SUCCESS] ${formatted}`, ...args);
  }
}

/**
 * Log a warning message
 */
export function warn(message: string, ...args: unknown[]): void {
  const formatted = formatMessage(message);
  if (config.colors) {
    console.log(chalk.yellow('⚠️  ' + formatted), ...args);
  } else {
    console.log(`[WARN] ${formatted}`, ...args);
  }
}

/**
 * Log an error message
 */
export function error(message: string, ...args: unknown[]): void {
  const formatted = formatMessage(message);
  if (config.colors) {
    console.error(chalk.red('❌ ' + formatted), ...args);
  } else {
    console.error(`[ERROR] ${formatted}`, ...args);
  }
}

/**
 * Log a step in a process
 */
export function step(stepNumber: number, total: number, message: string): void {
  const progress = `[${stepNumber}/${total}]`;
  if (config.colors) {
    console.log(chalk.cyan(progress) + ' ' + message);
  } else {
    console.log(`${progress} ${message}`);
  }
}

/**
 * Log a bullet point item
 */
export function bullet(message: string, indent = 0): void {
  const padding = '  '.repeat(indent);
  if (config.colors) {
    console.log(padding + chalk.gray('•') + ' ' + message);
  } else {
    console.log(`${padding}• ${message}`);
  }
}

/**
 * Log a file path with highlighting
 */
export function file(path: string, description?: string): void {
  if (config.colors) {
    const fileStr = chalk.cyan(path);
    console.log(`  📄 ${fileStr}${description ? chalk.gray(` - ${description}`) : ''}`);
  } else {
    console.log(`  [FILE] ${path}${description ? ` - ${description}` : ''}`);
  }
}

/**
 * Log a directory path with highlighting
 */
export function directory(path: string, description?: string): void {
  if (config.colors) {
    const dirStr = chalk.yellow(path);
    console.log(`  📁 ${dirStr}${description ? chalk.gray(` - ${description}`) : ''}`);
  } else {
    console.log(`  [DIR] ${path}${description ? ` - ${description}` : ''}`);
  }
}

/**
 * Create a boxed header
 */
export function header(title: string): void {
  const line = '═'.repeat(title.length + 4);
  console.log('');
  if (config.colors) {
    console.log(chalk.bold.blue(`╔${line}╗`));
    console.log(chalk.bold.blue(`║  ${title}  ║`));
    console.log(chalk.bold.blue(`╚${line}╝`));
  } else {
    console.log(`+${'-'.repeat(title.length + 4)}+`);
    console.log(`|  ${title}  |`);
    console.log(`+${'-'.repeat(title.length + 4)}+`);
  }
  console.log('');
}

/**
 * Create a simple divider
 */
export function divider(): void {
  if (config.colors) {
    console.log(chalk.gray('─'.repeat(50)));
  } else {
    console.log('-'.repeat(50));
  }
}

/**
 * Log metrics in a formatted way
 */
export function metrics(data: Record<string, number | string>): void {
  console.log('');
  for (const [key, value] of Object.entries(data)) {
    if (config.colors) {
      console.log(`  ${chalk.gray(key + ':')} ${chalk.bold(String(value))}`);
    } else {
      console.log(`  ${key}: ${value}`);
    }
  }
  console.log('');
}

/**
 * Log with a custom emoji prefix
 */
export function emoji(icon: string, message: string, ...args: unknown[]): void {
  console.log(`${icon} ${message}`, ...args);
}

/**
 * Create a simple spinner (for async operations)
 */
export function createSpinner(message: string): {
  succeed: (msg?: string) => void;
  fail: (msg?: string) => void;
  update: (msg: string) => void;
} {
  let currentMessage = message;
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let frameIndex = 0;
  let interval: NodeJS.Timeout | null = null;

  // Start spinner
  if (config.colors && process.stdout.isTTY) {
    process.stdout.write(`${chalk.cyan(frames[0])} ${currentMessage}`);
    interval = setInterval(() => {
      frameIndex = (frameIndex + 1) % frames.length;
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(`${chalk.cyan(frames[frameIndex])} ${currentMessage}`);
    }, 80);
  } else {
    console.log(`[...] ${currentMessage}`);
  }

  return {
    succeed: (msg?: string) => {
      if (interval) clearInterval(interval);
      if (config.colors && process.stdout.isTTY) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
      }
      success(msg || currentMessage);
    },
    fail: (msg?: string) => {
      if (interval) clearInterval(interval);
      if (config.colors && process.stdout.isTTY) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
      }
      error(msg || currentMessage);
    },
    update: (msg: string) => {
      currentMessage = msg;
    },
  };
}

export const logger = {
  debug,
  info,
  success,
  warn,
  error,
  step,
  bullet,
  file,
  directory,
  header,
  divider,
  metrics,
  emoji,
  createSpinner,
  configure: configureLogger,
};

export default logger;
