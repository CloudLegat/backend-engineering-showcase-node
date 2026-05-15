import js from '@eslint/js'
import stylisticPlugin from '@stylistic/eslint-plugin'
import betterMaxParamsPlugin from 'eslint-plugin-better-max-params'
import checkFilePlugin from 'eslint-plugin-check-file'
import importPlugin from 'eslint-plugin-import'
import perfectionistPlugin from 'eslint-plugin-perfectionist'
import sonarjsPlugin from 'eslint-plugin-sonarjs'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const KEBAB_CASE_WITH_DOTTED_SUFFIXES =
  '+([a-z])*([a-z0-9])*(-+([a-z0-9]))*(.@(adapter|command|config|controller|d|dto|entity|env|error|handler|module|port|repository|service|spec|test))'

export default [
  {
    ignores: ['dist', 'eslint.config.mjs'],
    name: 'project-ignore',
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  {
    files: ['**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'],
    languageOptions: {
      ecmaVersion: 2023,
      globals: {
        ...globals.es2023,
        ...globals.node,
      },
      parserOptions: {
        ecmaFeatures: true,
        extraFileExtensions: ['.mjs', '.mts'],
        project: true,
        tsconfigDirName: import.meta.dirname,
      },
      sourceType: 'module',
    },
    name: 'project-config',
    plugins: {
      '@stylistic': stylisticPlugin,
      'better-max-params': betterMaxParamsPlugin,
      'check-file': checkFilePlugin,
      'import': importPlugin,
      'perfectionist': perfectionistPlugin,
      'sonarjs': sonarjsPlugin,
    },
    rules: {
      '@stylistic/padding-line-between-statements': [
        'error',
        { blankLine: 'always', next: 'return', prev: '*' },
        { blankLine: 'always', next: '*', prev: 'multiline-block-like' },
        { blankLine: 'always', next: 'function', prev: '*' },
      ],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/semi': ['error', 'never'],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { fixStyle: 'inline-type-imports', prefer: 'type-imports' },
      ],
      '@typescript-eslint/explicit-member-accessibility': 'error',
      '@typescript-eslint/naming-convention': [
        'error',
        { format: ['PascalCase'], selector: 'typeLike' },
        { format: ['PascalCase', 'camelCase'], selector: 'enumMember' },
      ],
      '@typescript-eslint/no-extraneous-class': ['error', { allowWithDecorator: true }],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/require-await': 'error',
      '@typescript-eslint/strict-boolean-expressions': 'error',
      '@typescript-eslint/switch-exhaustiveness-check': 'error',
      'better-max-params/better-max-params': ['error', { constructor: 6, func: 2 }],
      'check-file/filename-naming-convention': [
        'error',
        { '**/*.{ts,tsx,mts,cts}': KEBAB_CASE_WITH_DOTTED_SUFFIXES },
      ],
      'check-file/no-index': 'error',
      'curly': ['error', 'multi-line'],
      'id-length': ['error', { exceptions: ['_', 't', 'ns'], min: 2 }],
      'import/no-cycle': 'error',
      'import/no-deprecated': 'error',
      'import/no-duplicates': 'error',
      'no-console': 'error',
      'perfectionist/sort-imports': [
        'error',
        {
          groups: [
            'type',
            'builtin',
            'external',
            'internal-type',
            'internal',
            ['parent-type', 'sibling-type', 'index-type'],
            ['parent', 'sibling', 'index'],
            'object',
            'unknown',
          ],
          newlinesBetween: 'always',
        },
      ],
      'perfectionist/sort-objects': 'error',
      'require-await': 'off',
      'sonarjs/cognitive-complexity': ['error', 4],
    },
    settings: {
      'import/resolver': {
        typescript: {
          alwaysTryTypes: true,
          project: ['./tsconfig.json'],
        },
      },
    },
  },
  {
    files: ['src/modules/**/typeorm/migrations/*.ts'],
    name: 'project-migrations-config',
    rules: {
      'check-file/filename-naming-convention': 'off',
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.test.ts'],
    name: 'project-test-config',
    rules: {
      '@typescript-eslint/no-unnecessary-condition': 'off',
      'better-max-params/better-max-params': 'off',
    },
  },
]
