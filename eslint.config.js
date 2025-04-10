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
      // 型情報が必要なルールは各設定で個別に有効化
  },
  globals: {
      ...globals.node, // Use spread syntax
      ...globals.jest, // Use spread syntax
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
    }],
    // Added error handling rules (TS-2)
    'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
    '@typescript-eslint/no-explicit-any': 'warn',
    'prefer-promise-reject-errors': 'error',
    '@typescript-eslint/explicit-function-return-type': ['error', {
      allowExpressions: true,
      allowTypedFunctionExpressions: true
    }],
    '@typescript-eslint/consistent-type-assertions': 'error',
    // Added async error handling rules (TS-3) - 型情報が必要なルールなので注意
    // '@typescript-eslint/no-floating-promises': 'error',
    // '@typescript-eslint/no-misused-promises': 'error',
    // '@typescript-eslint/no-throw-literal': 'error', // 一時的に無効化
    // dependencies にないパッケージの import を禁止
    'import/no-extraneous-dependencies': ['error', { 'devDependencies': false, 'optionalDependencies': false, 'peerDependencies': false }]
  }
};

// テスト用の設定（より緩い）
const testConfig = {
  ...baseConfig, // Use spread syntax
  rules: {
    ...baseConfig.rules, // Use spread syntax
    '@typescript-eslint/no-unused-vars': 'off', // テストでは未使用変数を許可
    'no-undef': 'off' // テストでは未定義変数の警告を無効化
  }
};

export default [
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '**/temp/**']
  },
  js.configs.recommended,
  {
    ...baseConfig, // Use spread syntax
    // src 配下とpackages内のファイルに基本設定を適用
    files: ['src/**/*.ts', 'packages/*/src/**/*.ts'],
    rules: {
      ...baseConfig.rules, // Use spread syntax
      // 警告をエラーにしない設定
      '@typescript-eslint/no-unused-vars': ['warn', {
        'argsIgnorePattern': '^_',
        'varsIgnorePattern': '^_',
        'ignoreRestSiblings': true
      }]
    }
  },
  {
    ...testConfig, // Use spread syntax
    // tests 配下のファイルにテスト用設定を適用
    files: [
      'tests/**/*.ts',
      'tests/**/*.js',
      '**/*.test.ts',
      '**/*.test.js',
      '**/test/**/*.ts',
      '**/test/**/*.js',
      '**/tests/**/*.ts',
      '**/tests/**/*.js'
    ]
  },
  {
    // Apply base config to scripts, but with more permissive rules for JS files
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest
      }
    },
    rules: {
      // JS固有のルールに制限し、TypeScriptの型情報が必要なルールは除外
      '@typescript-eslint/explicit-function-return-type': 'off',
      'import/no-commonjs': 'off',
      '@typescript-eslint/no-var-requires': 'off',
      // 型情報が必要なルールをOFFにする
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off'
    }
  },
  {
    // toolsディレクトリのTypeScriptファイル用設定
    files: ['tools/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module'
        // project設定は削除（対応するtsconfig.jsonが存在しない可能性）
      },
      globals: {
        ...globals.node
      }
    },
    rules: {
      // tools用に緩めの設定
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      'no-console': 'off' // toolsでのconsole出力は許可
    }
  },
  {
    // packages/mcp専用の設定（型チェックあり）
    files: ['packages/mcp/src/**/*.ts'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './packages/mcp/tsconfig.json'
      }
    },
    rules: {
      // 型情報が必要なルールを有効化
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-misused-promises': 'warn'
    }
  }
];
