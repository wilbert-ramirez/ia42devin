require('dotenv').config();
const { Pool } = require('pg');

// Configuración de conexión a PostgreSQL
const dbConfig = {
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 25,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 5000,
    acquireTimeoutMillis: 60000,
};

// Pool de conexiones
const pool = new Pool(dbConfig);

// Función para probar la conexión
const testConnection = async () => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        console.log('🔗 Conexión a la base de datos exitosa:', result.rows[0].now);
        client.release();
        return true;
    } catch (err) {
        console.error('❌ Error al conectar con la base de datos:', err);
        return false;
    }
};

module.exports = {
    pool,
    testConnection
};
