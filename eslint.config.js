// @ts-check
import eslint from '@eslint/js';
import prettierPlugin from 'eslint-plugin-prettier';
import unusedImportsPlugin from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  // ...tseslint.configs.recommendedTypeChecked, // 一時的に厳格な型チェックを無効化
  {
    // Prettierプラグインの設定
    plugins: {
      prettier: prettierPlugin,
      'unused-imports': unusedImportsPlugin,
    },
    rules: {
      // Prettierルール
      'prettier/prettier': [
        'warn',
        {
          semi: true,
          trailingComma: 'es5',
          singleQuote: true,
          printWidth: 100,
          tabWidth: 2,
          useTabs: false,
          bracketSpacing: true,
          arrowParens: 'always',
          endOfLine: 'lf',
        },
      ],

      // 一般的なルール
      'no-console': ['warn', { allow: ['error', 'warn', 'info'] }],
      'no-unused-vars': ['warn', { 
        args: 'none', 
        vars: 'all', 
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'prefer-const': 'warn',
      'no-var': 'warn',
      eqeqeq: ['warn', 'always', { null: 'ignore' }],
    },
  },
  {
    // TypeScriptファイル用の設定
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.test.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // TypeScriptルール
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-explicit-any': 'off', // 後で警告に戻す
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { 
          args: 'none', 
          vars: 'all', 
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-empty-object-type': 'warn',
      // '@typescript-eslint/no-floating-promises': 'warn',
      // '@typescript-eslint/no-misused-promises': 'warn',
      '@typescript-eslint/no-namespace': 'warn',
    },
  },
  {
    // テストファイル用の特別ルール
    files: ['**/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      'no-unused-vars': 'off', // テストファイルでは未使用変数を許可
      '@typescript-eslint/no-unused-vars': 'off', // テストファイルでは未使用変数を許可
    },
  },
  {
    // 無視するファイルやディレクトリ
    ignores: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      '**/*.d.ts',
      'jest.config.cjs',
      'scripts/**/*.js',
      'eslint.config.js',
    ],
  }
);
