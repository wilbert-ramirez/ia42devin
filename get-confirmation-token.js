const { pool } = require('./config/database');

const getToken = async () => {
    try {
        const result = await pool.query(`
            SELECT email, confirmation_token 
            FROM users 
            WHERE email = 'juan@test.com' 
            AND status = 'pending'
        `);
        
        if (result.rows.length > 0) {
            console.log('🔑 Token de confirmación para juan@test.com:');
            console.log(result.rows[0].confirmation_token);
        } else {
            console.log('❌ No se encontró token pendiente');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

getToken();