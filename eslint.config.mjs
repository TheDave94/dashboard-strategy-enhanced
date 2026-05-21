import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import security from 'eslint-plugin-security';
import lit from 'eslint-plugin-lit';
import litA11y from 'eslint-plugin-lit-a11y';
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
      // eslint-plugin-lit catches Lit template authorship mistakes
      // (unknown directive bindings, attribute-vs-property typos,
      // mis-quoted values, etc.) at lint time so they don't surface
      // as silent rendering bugs.
      lit,
      // eslint-plugin-lit-a11y enforces baseline a11y on Lit templates
      // — alt text, label associations, keyboard parity for click
      // handlers, etc. v4.6.1 onboarding closes two existing keyboard-
      // activation bugs in SetupTab + ScreensaverCard; this plugin
      // prevents that class of regression.
      'lit-a11y': litA11y,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      // Lit + lit-a11y recommended rule sets. The plugin authors keep
      // these focused on real bugs (no opinionated style nits).
      ...lit.configs.recommended.rules,
      ...litA11y.configs.recommended.rules,
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
      // Ban the `unsafeHTML(localize(...))` pattern that v4.5.0 §S-1
      // refactored away. The canonical replacement is renderLocalized()
      // from src/utils/safe-localize.ts. Any new call site would
      // re-introduce the translation-XSS sink described in the review.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "CallExpression[callee.name='unsafeHTML'][arguments.0.type='CallExpression'][arguments.0.callee.name='localize']",
          message:
            "unsafeHTML(localize(...)) is banned — translation strings can ship arbitrary HTML and become an XSS sink. Use renderLocalized() from src/utils/safe-localize.ts instead, which only allows <strong> and <em>. See review §S-1.",
        },
      ],
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**'],
  },
];
