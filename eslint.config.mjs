import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import security from 'eslint-plugin-security';
import prettier from 'eslint-config-prettier';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      // eslint-plugin-security loaded so its rules are *known names*,
      // but they're all disabled below. None of the strategy's
      // bracket-access call sites involve user-controlled property
      // names — entity IDs come from HA's typed registry or the
      // dashboard config — and the previous per-line eslint-disable
      // markers were noise. See audit §2.11.
      security,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      // Prettier handles formatting
      ...prettier.rules,
      // Pragmatic overrides
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // Disabled — the strategy reads hass.states[entity_id] with
      // entity IDs sourced from HA's typed registry. False-positive
      // density was high and signal was zero.
      'security/detect-object-injection': 'off',
      'security/detect-non-literal-fs-filename': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
