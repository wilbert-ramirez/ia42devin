const { pool } = require('./config/database');

const checkDatabase = async () => {
    try {
        const result = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);
        
        console.log('📊 Tablas existentes en la base de datos:');
        result.rows.forEach(row => {
            console.log(`  - ${row.table_name}`);
        });
        
        console.log(`\n🔢 Total: ${result.rows.length} tablas encontradas`);
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

checkDatabase();