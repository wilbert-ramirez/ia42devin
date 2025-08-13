const fs = require('fs');

// Leer server.js
let serverContent = fs.readFileSync('src/api/server.js', 'utf8');

// Reemplazar configuración de helmet
serverContent = serverContent.replace(
  'app.use(helmet(helmetConfig));',
  'app.use(helmet({ contentSecurityPolicy: false }));'
);

// Escribir archivo
fs.writeFileSync('src/api/server.js', serverContent);
console.log('✅ CSP deshabilitado en server.js');
