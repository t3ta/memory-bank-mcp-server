export default {
  preset: 'ts-jest/presets/default-esm', // Use ESM preset
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    // '^.+\\.tsx?$': [...] // Remove the old transform config
   },
   // Restore moduleNameMapper to handle .js extensions in imports
   moduleNameMapper: {
     '^(\\.{1,2}/.*)\\.js$': '$1',
   },
   testMatch: ['**/tests/**/*.test.ts'],
   collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
};
