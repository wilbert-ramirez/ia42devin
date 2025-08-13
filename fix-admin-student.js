const { pool } = require('./config/database');

const fixAdminStudent = async () => {
    try {
        const adminId = '209dbe6a-1a9f-4aba-9fd5-3c5b723e6086';
        
        // Verificar si ya existe el estudiante
        const existingStudent = await pool.query(`
            SELECT id_student FROM student WHERE id_student = $1
        `, [adminId]);
        
        if (existingStudent.rows.length === 0) {
            // Crear el registro de estudiante
            await pool.query(`
                INSERT INTO student (id_student, name, email, status)
                VALUES ($1, 'Admin Principal', 'admin@ia42.com', 'Active')
            `, [adminId]);
            
            console.log('✅ Registro de estudiante creado para admin');
        } else {
            console.log('ℹ️ El registro de estudiante ya existe');
        }
        
        // Actualizar la relación en users
        await pool.query(`
            UPDATE users SET id_student = $1 WHERE id = $1
        `, [adminId]);
        
        console.log('✅ Relación usuario-estudiante actualizada');
        
        // Verificar que todo esté correcto
        const verification = await pool.query(`
            SELECT u.id, u.email, u.id_student,
                   s.name, s.status as student_status
            FROM users u
            LEFT JOIN student s ON u.id_student = s.id_student
            WHERE u.email = 'admin@ia42.com'
        `);
        
        console.log('📊 Verificación:');
        console.log(verification.rows[0]);
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

fixAdminStudent();