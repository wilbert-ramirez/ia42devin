const { pool } = require('./config/database');

const getAdminToken = async () => {
    try {
        const result = await pool.query(`
            SELECT confirmation_token, id
            FROM users 
            WHERE email = 'admin@ia42.com' 
            AND status = 'pending'
        `);
        
        if (result.rows.length > 0) {
            const admin = result.rows[0];
            console.log('🔑 Token de confirmación para admin:');
            console.log(admin.confirmation_token);
            console.log('👤 Admin ID:', admin.id);
        } else {
            console.log('❌ No se encontró admin pendiente');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

getAdminToken();