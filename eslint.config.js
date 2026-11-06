import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

// Pragmatic flat config for a React 18 + Vite app.
// The codebase is intentionally compact and uses inline styles throughout, so we
// deliberately keep stylistic/opinionated rules OFF and target only real bugs:
// undefined references, unused variables, and React hooks correctness.
export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'public/**', 'coverage/**'],
  },

  js.configs.recommended,

  // Application source (browser + web-worker code).
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.worker,
        __APP_VERSION__: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      // Mark identifiers used in JSX as "used" so no-unused-vars doesn't flag
      // imported components. (We intentionally skip the rest of react/recommended
      // — prop-types, no-unknown-property for r3f props, etc. — which would flag
      // thousands of intentional patterns.)
      'react/jsx-uses-vars': 'error',
      'react/jsx-uses-react': 'off',

      // React hooks: correctness as an error, dependency hygiene as a warning so
      // the existing `// eslint-disable-line react-hooks/exhaustive-deps` pragmas
      // keep doing their job without failing the build.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // Real problems only.
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },

  // Test files (Vitest). Globals are imported explicitly, so just node env here.
  {
    files: ['src/**/*.{test,spec}.{js,jsx}', 'tests/**/*.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Config / tooling files run in Node.
  {
    files: ['*.config.js', 'vite.config.js', 'vitest.config.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { ...globals.node },
    },
  },

  // Disable all formatting-related rules — Prettier owns formatting.
  prettier,
];
