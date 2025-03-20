import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    rules: {
      // Enforce ESM patterns
      'import/no-commonjs': 'error',
      '@typescript-eslint/no-var-requires': 'error',
      'import/no-unresolved': 'off' // Keep this off since it depends on config
    }
  }
];
