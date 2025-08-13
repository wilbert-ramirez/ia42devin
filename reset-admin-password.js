const { pool } = require('./config/database');
const { hashPassword } = require('./src/lib/auth');

const resetAdminPassword = async () => {
    try {
        const newPassword = 'SuperAdmin123@';
        const hashedPassword = await hashPassword(newPassword);
        
        await pool.query(`
            UPDATE users 
            SET password_hash = $1
            WHERE email = 'admin@ia42.com'
        `, [hashedPassword]);
        
        console.log('✅ Password del admin actualizado');
        console.log(`📧 Email: admin@ia42.com`);
        console.log(`🔑 Password: ${newPassword}`);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

resetAdminPassword();