/**
 * Jest Test Setup
 * This file runs before all tests to configure the test environment
 */

// Set test environment
process.env.NODE_ENV = 'test';

// Suppress console output during tests unless explicitly needed
// Uncomment these lines to see all console output during tests
// const originalConsoleLog = console.log;
// const originalConsoleError = console.error;

beforeAll(() => {
  // Setup before all tests
});

afterAll(() => {
  // Cleanup after all tests
});

// Global test timeout
jest.setTimeout(10000);
