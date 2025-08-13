const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: false
});

async function deleteUser(email) {
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        console.log(`🗑️ Eliminando usuario: ${email}`);
        
        // 1. Obtener IDs
        const userResult = await client.query(
            'SELECT id, id_student FROM users WHERE email = $1',
            [email]
        );
        
        if (userResult.rows.length === 0) {
            console.log('❌ Usuario no encontrado');
            return;
        }
        
        const { id: userId, id_student: studentId } = userResult.rows[0];
        console.log(`📋 User ID: ${userId}, Student ID: ${studentId}`);
        
        // 2. Limpiar registros relacionados
        await client.query('DELETE FROM login_attempts WHERE email = $1', [email]);
        await client.query('DELETE FROM email_verifications WHERE id_student = $1', [studentId]);
        await client.query('DELETE FROM password_resets WHERE id_student = $1', [studentId]);
        await client.query('DELETE FROM user_roles WHERE user_id = $1', [userId]);
        await client.query('DELETE FROM studentlog WHERE id_student = $1', [studentId]);
        await client.query('DELETE FROM login WHERE id_student = $1', [studentId]);
        
        // 3. Remover FK y eliminar
        await client.query('UPDATE users SET id_student = NULL WHERE id = $1', [userId]);
        await client.query('DELETE FROM student WHERE id_student = $1', [studentId]);
        await client.query('DELETE FROM users WHERE id = $1', [userId]);
        
        await client.query('COMMIT');
        console.log('✅ Usuario eliminado completamente');
        
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Error:', error.message);
    } finally {
        client.release();
        await pool.end();
    }
}

// 📥 RECIBIR EMAIL COMO PARÁMETRO
const email = process.argv[2];

if (!email) {
    console.log('❌ Error: Debes proporcionar un email');
    console.log('📖 Uso: node delete-user.js email@ejemplo.com');
    process.exit(1);
}

// Validar formato básico de email
if (!email.includes('@')) {
    console.log('❌ Error: Email no válido');
    process.exit(1);
}

// Confirmar antes de eliminar
console.log(`⚠️ ¿Estás seguro de eliminar el usuario: ${email}?`);
console.log('🔄 Ejecutando en 3 segundos... (Ctrl+C para cancelar)');

setTimeout(() => {
    deleteUser(email);
}, 3000);