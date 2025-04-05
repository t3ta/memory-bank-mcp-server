export default {
  preset: 'ts-jest/presets/default-esm', // Use ESM preset
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        // useESM: true, // preset が default-esm なので不要かも (再挑戦)
        // tsconfig: 'tsconfig.json', // tsconfig は通常自動検出される
      },
    ],
  },
   moduleNameMapper: {
     // Restore original setting to handle .js extensions in source code imports
     '^(\\.{1,2}/.*)\\.js$': '$1',
   },
   testMatch: ['**/tests/**/*.test.ts'],
   collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
  ],
};
