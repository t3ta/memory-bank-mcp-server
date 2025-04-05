export default {
  preset: 'ts-jest/presets/default-esm', // Use ESM preset
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  transform: {}, // preset に任せるため空にする
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
