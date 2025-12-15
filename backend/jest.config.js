/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts', '**/*.spec.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
    '!src/main.ts',  // Exclude NestJS entry point (bootstrap function)
    '!src/**/index.ts',  // Exclude re-export index files (they have no functions)
    '!src/database/cli.ts',  // Exclude CLI entry point (production CLI script)
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 65,  // Lower threshold for branches due to environment-specific initialization code
      functions: 80,  // Slightly lower for NestJS lifecycle methods
      lines: 80,
      statements: 80,
    },
  },
  moduleNameMapper: {
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  verbose: true,
  testTimeout: 10000,
};
