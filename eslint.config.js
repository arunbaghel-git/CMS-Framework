import js from '@eslint/js'
import globals from 'globals'

/** Shared rules across every workspace package. */
const base = {
  ...js.configs.recommended.rules,
  'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
  'no-console': ['warn', { allow: ['warn', 'error'] }],
  eqeqeq: ['error', 'always', { null: 'ignore' }],
  'prefer-const': 'error',
  'no-var': 'error',
}

export default [
  {
    ignores: ['**/node_modules/**', '**/dist/**', '**/.next/**', '**/build/**', '**/coverage/**'],
  },

  // API — Node
  {
    files: ['apps/api/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: base,
  },

  // Admin + web + shared packages — browser
  {
    files: ['apps/admin/**/*.{js,jsx}', 'apps/web/**/*.{js,jsx}', 'packages/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: base,
  },

  // CLI — console output hi iska interface hai
  {
    files: ['apps/api/src/cli.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: { ...base, 'no-console': 'off' },
  },

  // Migrations — deploy step pe chalti hain, model layer se independent
  {
    files: ['migrations/**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: { ...base, 'no-console': 'off' },
  },

  // Tests
  {
    files: ['**/*.test.js', '**/*.test.jsx', '**/tests/**/*.js'],
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
    rules: { ...base, 'no-console': 'off' },
  },
]
