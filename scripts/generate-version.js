const fs = require('fs');
const path = require('path');

// Genera src/app/version.ts a partir del campo "version" de package.json.
// Se corre antes de cada build (ver scripts en package.json) para que la
// pantalla de login siempre muestre la versión real del build desplegado.

const pkg = require(path.resolve(__dirname, '../package.json'));

const content =
  `// Generado automáticamente por scripts/generate-version.js a partir de package.json.\n` +
  `// No editar a mano: se sobreescribe en cada build.\n` +
  `export const APP_VERSION = '${pkg.version}';\n`;

fs.writeFileSync(path.resolve(__dirname, '../src/app/version.ts'), content);
console.log(`version.ts generado con versión ${pkg.version}`);
