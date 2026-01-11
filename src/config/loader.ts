/**
 * Configuration loader for ArchPulse
 * @module config/loader
 */

import * as fs from 'fs';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';
import { ArchPulseConfig, GroupingRule, OutputConfig, StyleConfig } from '../types';
import { debug, warn } from '../utils/logger';

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: ArchPulseConfig = {
    ignore: [
        'node_modules/**',
        'dist/**',
        'build/**',
        '.git/**',
        'coverage/**',
        '**/*.test.ts',
        '**/*.test.js',
        '**/*.spec.ts',
        '**/*.spec.js',
        '**/__tests__/**',
        '**/__mocks__/**',
    ],
    grouping: [],
    output: {
        directory: 'docs',
        filename: 'architecture',
        formats: ['drawio'],
    },
    styles: {
        frontend: '#3498db',    // Blue
        backend: '#2ecc71',     // Green
        database: '#9b59b6',    // Purple
        external: '#95a5a6',    // Gray
        shared: '#f39c12',      // Orange
        api: '#1abc9c',         // Teal
        services: '#e74c3c',    // Red
        utils: '#34495e',       // Dark gray
    },
    extensions: [
        '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
        '.py', '.pyw',
    ],
};

/**
 * Config file names to search for (in order of priority)
 */
const CONFIG_FILE_NAMES = [
    'archpulse.config.yml',
    'archpulse.config.yaml',
    'archpulse.yml',
    'archpulse.yaml',
    '.archpulserc.yml',
    '.archpulserc.yaml',
    '.archpulserc',
];

/**
 * Find config file in the given directory
 */
export function findConfigFile(projectRoot: string): string | null {
    for (const filename of CONFIG_FILE_NAMES) {
        const configPath = path.join(projectRoot, filename);
        if (fs.existsSync(configPath)) {
            debug(`Found config file: ${configPath}`);
            return configPath;
        }
    }
    return null;
}

/**
 * Parse and validate grouping rules
 */
function parseGroupingRules(raw: unknown): GroupingRule[] {
    if (!Array.isArray(raw)) return [];

    return raw
        .filter((item): item is Record<string, unknown> =>
            typeof item === 'object' && item !== null)
        .filter(item =>
            typeof item.pattern === 'string' &&
            typeof item.label === 'string')
        .map(item => ({
            pattern: item.pattern as string,
            label: item.label as string,
            color: typeof item.color === 'string' ? item.color : undefined,
        }));
}

/**
 * Parse and validate output config
 */
function parseOutputConfig(raw: unknown): Partial<OutputConfig> {
    if (typeof raw !== 'object' || raw === null) return {};

    const obj = raw as Record<string, unknown>;
    const result: Partial<OutputConfig> = {};

    if (typeof obj.directory === 'string') {
        result.directory = obj.directory;
    }

    if (typeof obj.filename === 'string') {
        result.filename = obj.filename;
    }

    if (Array.isArray(obj.formats)) {
        const validFormats = ['drawio', 'png', 'svg', 'mermaid'] as const;
        result.formats = obj.formats.filter(
            (f): f is typeof validFormats[number] =>
                typeof f === 'string' && validFormats.includes(f as typeof validFormats[number])
        );
    }

    return result;
}

/**
 * Parse and validate style config
 */
function parseStyleConfig(raw: unknown): Partial<StyleConfig> {
    if (typeof raw !== 'object' || raw === null) return {};

    const obj = raw as Record<string, unknown>;
    const result: Partial<StyleConfig> = {};

    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) {
            result[key] = value;
        } else if (typeof value === 'string') {
            warn(`Invalid color format for style "${key}": ${value}. Expected hex color (e.g., #3498db)`);
        }
    }

    return result;
}

/**
 * Parse raw YAML config into validated ArchPulseConfig
 */
function parseConfig(raw: unknown): Partial<ArchPulseConfig> {
    if (typeof raw !== 'object' || raw === null) {
        return {};
    }

    const obj = raw as Record<string, unknown>;
    const result: Partial<ArchPulseConfig> = {};

    // Parse ignore patterns
    if (Array.isArray(obj.ignore)) {
        result.ignore = obj.ignore.filter(
            (item): item is string => typeof item === 'string'
        );
    }

    // Parse grouping rules
    if (obj.grouping !== undefined) {
        result.grouping = parseGroupingRules(obj.grouping);
    }

    // Parse output config
    if (obj.output !== undefined) {
        result.output = {
            ...DEFAULT_CONFIG.output,
            ...parseOutputConfig(obj.output),
        };
    }

    // Parse styles
    if (obj.styles !== undefined) {
        result.styles = {
            ...DEFAULT_CONFIG.styles,
            ...(parseStyleConfig(obj.styles) as StyleConfig),
        } as StyleConfig;
    }

    // Parse extensions
    if (Array.isArray(obj.extensions)) {
        result.extensions = obj.extensions
            .filter((item): item is string => typeof item === 'string')
            .map(ext => ext.startsWith('.') ? ext : `.${ext}`);
    }

    return result;
}

/**
 * Load configuration from file
 */
export function loadConfigFile(configPath: string): Partial<ArchPulseConfig> {
    try {
        const content = fs.readFileSync(configPath, 'utf-8');
        const raw = parseYaml(content);
        return parseConfig(raw);
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        warn(`Failed to load config file: ${message}`);
        return {};
    }
}

/**
 * Load and merge configuration
 * Priority: CLI options > config file > defaults
 */
export function loadConfig(
    projectRoot: string,
    configPath?: string,
    overrides?: Partial<ArchPulseConfig>
): ArchPulseConfig {
    // Start with defaults
    let config: ArchPulseConfig = { ...DEFAULT_CONFIG };

    // Find and load config file
    const foundConfigPath = configPath || findConfigFile(projectRoot);
    if (foundConfigPath) {
        const fileConfig = loadConfigFile(foundConfigPath);
        config = mergeConfig(config, fileConfig);
        debug(`Loaded config from: ${foundConfigPath}`);
    } else {
        debug('No config file found, using defaults');
    }

    // Apply overrides
    if (overrides) {
        config = mergeConfig(config, overrides);
    }

    return config;
}

/**
 * Deep merge two config objects
 */
function mergeConfig(
    base: ArchPulseConfig,
    override: Partial<ArchPulseConfig>
): ArchPulseConfig {
    return {
        ignore: override.ignore ?? base.ignore,
        grouping: override.grouping ?? base.grouping,
        output: {
            ...base.output,
            ...override.output,
        },
        styles: {
            ...base.styles,
            ...override.styles,
        },
        extensions: override.extensions ?? base.extensions,
    };
}

/**
 * Generate a sample config file content
 */
export function generateSampleConfig(): string {
    return `# ArchPulse Configuration
# See https://github.com/ThanhNguyxn/ArchPulse for documentation

# Directories and patterns to ignore
ignore:
  - node_modules/
  - dist/
  - build/
  - coverage/
  - "**/*.test.ts"
  - "**/*.spec.ts"

# Custom grouping rules
grouping:
  - pattern: "src/api/**"
    label: "API Layer"
    color: "#2ecc71"
  - pattern: "src/services/**"
    label: "Services"
    color: "#e74c3c"
  - pattern: "src/models/**"
    label: "Data Models"
    color: "#9b59b6"
  - pattern: "src/utils/**"
    label: "Utilities"
    color: "#95a5a6"

# Output configuration
output:
  directory: docs
  filename: architecture
  formats:
    - drawio
    - png

# Color scheme for component types
styles:
  frontend: "#3498db"
  backend: "#2ecc71"
  database: "#9b59b6"
  external: "#95a5a6"
  shared: "#f39c12"
`;
}

/**
 * Create a sample config file in the project
 */
export function createSampleConfig(projectRoot: string): string {
    const configPath = path.join(projectRoot, 'archpulse.config.yml');
    const content = generateSampleConfig();
    fs.writeFileSync(configPath, content, 'utf-8');
    return configPath;
}
