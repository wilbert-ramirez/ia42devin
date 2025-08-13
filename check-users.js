const { pool } = require('./config/database');

const checkUsers = async () => {
    try {
        console.log('👥 Usuarios registrados:\n');
        
        const users = await pool.query(`
            SELECT u.id, u.email, u.status, u.created_at,
                   s.name, s.status as student_status
            FROM users u
            LEFT JOIN student s ON u.id_student = s.id_student
            ORDER BY u.created_at DESC
        `);
        
        users.rows.forEach(user => {
            console.log(`📧 ${user.email}`);
            console.log(`   Nombre: ${user.name}`);
            console.log(`   Estado: ${user.status}`);
            console.log(`   Estudiante: ${user.student_status}`);
            console.log(`   Registrado: ${user.created_at}`);
            console.log('');
        });
        
        console.log(`✅ Total: ${users.rows.length} usuarios`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

checkUsers();