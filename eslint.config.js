import js from '@eslint/js';
import importPlugin from 'eslint-plugin-import';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import globals from 'globals';

// 共通の設定
const baseConfig = {
  plugins: {
    import: importPlugin,
    '@typescript-eslint': typescriptEslint
  },
  languageOptions: {
  parser: typescriptParser,
    parserOptions: {
      ecmaVersion: 2022,
      sourceType: 'module'
  },
  globals: {
      ..globals.node,
      ..globals.jest,
      NodeJS: 'readonly'
    }
  },
  rules: {
    // Enforce ESM patterns
    'import/no-commonjs': 'error',
    '@typescript-eslint/no-var-requires': 'error',
    'import/no-unresolved': 'off', // Keep this off since it depends on config
    'no-unused-vars': 'off', // Turn off base rule
    'no-undef': 'off', // Turn off undefined variable check for NodeJS types
    '@typescript-eslint/no-unused-vars': ['warn', {
      'argsIgnorePattern': '^_',
      'varsIgnorePattern': '^_',
      'ignoreRestSiblings': true
    }]
  }
};

// テスト用の設定（より緩い）
const testConfig = {
  ..baseConfig,
  rules: {
    ..baseConfig.rules,
    '@typescript-eslint/no-unused-vars': 'off', // テストでは未使用変数を許可
    'no-undef': 'off' // テストでは未定義変数の警告を無効化
  }
};

export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**']
  },
  js.configs.recommended,
  {
    ..baseConfig,
    // src 配下のファイルに基本設定を適用
    files: ['src/**/*.ts'],
    rules: {
      ..baseConfig.rules,
      // 警告をエラーにしない設定
      '@typescript-eslint/no-unused-vars': ['warn', {
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'ignoreRestSiblings': true
      }]
    }
  },
  {
    ..testConfig,
    // tests 配下のファイルにテスト用設定を適用
    files: ['tests/**/*.ts', 'tests/**/*.js']
  }
];
