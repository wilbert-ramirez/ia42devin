const { pool } = require('./config/database');

const getResetToken = async () => {
    try {
        const result = await pool.query(`
            SELECT pr.token, pr.expires_at, u.email
            FROM password_resets pr
            JOIN users u ON pr.id_student = u.id
            WHERE u.email = 'juan@test.com' 
            AND pr.used_at IS NULL
            ORDER BY pr.created_at DESC
            LIMIT 1
        `);
        
        if (result.rows.length > 0) {
            const token = result.rows[0];
            console.log('🔑 Token de recuperación para juan@test.com:');
            console.log(`Token: ${token.token}`);
            console.log(`Expira: ${token.expires_at}`);
        } else {
            console.log('❌ No se encontró token de recuperación');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

getResetToken();