const { resolve, join } = require('path');
const alias = require('rollup-plugin-alias');

const ROOT = join(__dirname, '../../../');

module.exports = alias({
  'mangojuice-router': resolve(ROOT, 'packages/mangojuice-router/dist/index.es.js'),
  'mangojuice-form': resolve(ROOT, 'packages/mangojuice-form/dist/index.es.js'),
  'mangojuice-intl': resolve(
    ROOT,
    'packages/mangojuice-intl/dist/index.es.js'
  ),
  'mangojuice-dom': resolve(
    ROOT,
    'packages/mangojuice-dom/dist/index.es.js'
  )
});
