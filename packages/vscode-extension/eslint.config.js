import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import globals from 'globals';

// Base configuration for VS Code extension
const vscodeBaseConfig = {
  plugins: {
    import: importPlugin,
    '@typescript-eslint': typescriptEslint
  },
  languageOptions: {
    parser: typescriptParser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      project: './tsconfig.json' // Link to tsconfig for type-aware rules
    },
    globals: {
      ...globals.node,
      ...globals.browser, // For WebView contexts
      vscode: 'readonly' // Add vscode global
    }
  },
  rules: {
    // Rules inherited/adapted from root config
    'import/no-unresolved': 'off',
    'no-unused-vars': 'off',
    'no-undef': 'off', // Handled by TypeScript
    '@typescript-eslint/no-unused-vars': ['warn', {
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_',
      'ignoreRestSiblings': true
    }],
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'prefer-promise-reject-errors': 'error',
    '@typescript-eslint/explicit-function-return-type': ['warn', { // Changed to warn for flexibility with VS Code APIs
      allowExpressions: true,
      allowTypedFunctionExpressions: true
    }],
    '@typescript-eslint/consistent-type-assertions': 'error',
    '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }], // ignoreVoid is often useful in extensions
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/no-throw-literal': 'error',

    // Rules removed/disabled from root config (due to CommonJS target)
    // 'import/no-commonjs': 'error', // Disabled for CommonJS environment
    // '@typescript-eslint/no-var-requires': 'error', // Disabled for CommonJS environment
  }
};

// Test configuration for VS Code extension (inherits and modifies vscodeBaseConfig)
const vscodeTestConfig = {
  ...vscodeBaseConfig,
  languageOptions: {
      ...vscodeBaseConfig.languageOptions,
      globals: {
          ...vscodeBaseConfig.languageOptions.globals,
          ...globals.jest // Add Jest globals for tests
      }
  },
  rules: {
    ...vscodeBaseConfig.rules,
    '@typescript-eslint/no-unused-vars': 'off', // Allow unused vars in tests
    '@typescript-eslint/no-explicit-any': 'off', // Allow 'any' in tests
    '@typescript-eslint/explicit-function-return-type': 'off', // Relax return type requirement in tests
    '@typescript-eslint/no-floating-promises': 'off', // Relax floating promises in tests
    '@typescript-eslint/no-misused-promises': 'off' // Relax misused promises in tests
  }
};

export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**']
  },
  js.configs.recommended,
  // Apply base config to source files
  {
    ...vscodeBaseConfig,
    files: ['src/**/*.ts'],
  },
  // Apply test config to test files
  {
    ...vscodeTestConfig,
    files: ['tests/**/*.ts']
  }
];
