const { pool } = require('./config/database');

const testTables = async () => {
    try {
        console.log('🔍 Probando acceso a las tablas principales...\n');
        
        // Probar tabla student
        const students = await pool.query('SELECT COUNT(*) as count FROM student');
        console.log(`👥 Estudiantes: ${students.rows[0].count} registros`);
        
        // Probar tabla lx (cursos)
        const courses = await pool.query('SELECT COUNT(*) as count FROM lx');
        console.log(`📚 Cursos: ${courses.rows[0].count} registros`);
        
        // Probar tabla lxcategory
        const categories = await pool.query('SELECT COUNT(*) as count FROM lxcategory');
        console.log(`🏷️  Categorías: ${categories.rows[0].count} registros`);
        
        // Probar tabla inscriptions
        const inscriptions = await pool.query('SELECT COUNT(*) as count FROM inscriptions');
        console.log(`📝 Inscripciones: ${inscriptions.rows[0].count} registros`);
        
        console.log('\n✅ Todas las tablas son accesibles');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

testTables();