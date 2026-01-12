/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    roots: ['<rootDir>/src'],
    testMatch: ['**/*.test.ts'],
    testPathIgnorePatterns: ['/node_modules/', '/__fixtures__/'],
    moduleFileExtensions: ['ts', 'js', 'json'],
    moduleNameMapper: {
        '^chalk$': '<rootDir>/src/__mocks__/chalk.ts',
    },
    collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/**/*.test.ts',
        '!src/__fixtures__/**',
        '!src/__mocks__/**',
        '!src/cli/**',
        '!src/index.ts',
    ],
    coverageThreshold: {
        global: {
            branches: 70,
            functions: 70,
            lines: 70,
            statements: 70,
        },
    },
    verbose: true,
};
