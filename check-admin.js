const { pool } = require('./config/database');

const checkAdmin = async () => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.email, u.status, u.confirmed_at,
                   s.name, s.status as student_status
            FROM users u
            LEFT JOIN student s ON u.id_student = s.id_student
            WHERE u.email = 'admin@ia42.com'
        `);
        
        if (result.rows.length > 0) {
            const admin = result.rows[0];
            console.log('👤 Estado del admin:');
            console.log(`Email: ${admin.email}`);
            console.log(`Status: ${admin.status}`);
            console.log(`Confirmed at: ${admin.confirmed_at}`);
            console.log(`Student name: ${admin.name}`);
            console.log(`Student status: ${admin.student_status}`);
        } else {
            console.log('❌ Admin no encontrado');
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

checkAdmin();