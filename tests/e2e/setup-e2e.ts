/**
 * Setup for E2E tests
 * 
 * This file is run before the tests to set up the environment.
 */

import { cleanupAllTempDirs } from './helpers/setup';

// Set up the jest environment - use a longer timeout for E2E tests
// We don't need to explicitly call setTimeout as it's set in the config

// Clean up all temp directories before running tests
beforeAll(() => {
  cleanupAllTempDirs();
});

// Clean up all temp directories after all tests are finished
afterAll(() => {
  cleanupAllTempDirs();
});
