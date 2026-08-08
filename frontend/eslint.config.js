import js from '@eslint/js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import globals from 'globals'

// Flat config (ESLint 9 style). Lints only the frontend source; build
// output and dependencies are excluded via the top-level `ignores` entry.
export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // New JSX transform (React 17+) doesn't require React in scope.
      'react/react-in-jsx-scope': 'off',
      // Project conventions document component props via JSDoc (see
      // CLAUDE.md's Code Commenting Standards), not the separate
      // `prop-types` runtime-validation package — no such dependency is
      // installed, so this rule would otherwise flag every component that
      // takes props (e.g. AuthProvider's `children`) without a realistic
      // fix.
      'react/prop-types': 'off',
    },
  },
]
