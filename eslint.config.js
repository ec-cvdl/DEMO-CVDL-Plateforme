// Lint du front : `npm run lint`. Scripts classiques (pas de modules) qui partagent leurs
// fonctions globales d'un fichier à l'autre : no-undef est désactivé, les variables de niveau
// fichier ne sont pas signalées comme inutilisées (elles servent dans d'autres fichiers).
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  { ignores: ['node_modules/**', 'qrcode.min.js', 'html-to-image.min.js', 'eslint.config.js'] },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: { ecmaVersion: 2023, sourceType: 'script', globals: { ...globals.browser } },
    rules: {
      'no-undef': 'off',
      'no-redeclare': 'off',
      'no-unused-vars': ['error', { vars: 'local', args: 'none', caughtErrors: 'none' }],
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
];
