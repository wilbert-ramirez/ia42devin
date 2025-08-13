const { pool } = require('./config/database');

const createLoginAttemptsTable = async () => {
    try {
        console.log('🔐 Creando tabla login_attempts...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS login_attempts (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                ip_address INET,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);
        
        // Crear índice para mejorar performance
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_login_attempts_email 
            ON login_attempts(email)
        `);
        
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_login_attempts_created 
            ON login_attempts(created_at)
        `);
        
        console.log('✅ Tabla login_attempts creada exitosamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

createLoginAttemptsTable();