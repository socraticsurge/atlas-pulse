import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      // Maintainability guardrails (see docs/TECH-DEBT.md). Warnings, capped by
      // --max-warnings in the lint script: existing debt is tolerated, new debt
      // fails CI. Lower the cap as work packages land.
      complexity: ['warn', 9],
      'max-lines-per-function': ['warn', { max: 70, skipBlankLines: true, skipComments: true }],
      'max-depth': ['warn', 3],
      'max-params': ['warn', 4],
      'max-nested-callbacks': ['warn', 3],
    },
  },
  {
    // Accessibility rules for the React UI. Where a rule is wrong for one
    // element, disable it inline with a reason; never turn a rule off here.
    files: ['src/**/*.{js,jsx}'],
    ...jsxA11y.flatConfigs.recommended,
  },
  {
    // Server code, scripts and the Vite config run on Node, not in the browser.
    files: ['server/**/*.js', 'scripts/**/*.js', 'vite.config.js'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
])
