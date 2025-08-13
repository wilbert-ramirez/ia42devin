const { testConnection } = require('./config/database');

console.log('🔍 Probando conexión a la base de datos...');
testConnection().then(() => {
    console.log('✅ Prueba completada');
    process.exit(0);
}).catch((error) => {
    console.error('❌ Error en la prueba:', error);
    process.exit(1);
});