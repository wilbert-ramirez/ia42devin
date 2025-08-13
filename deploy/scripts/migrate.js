const fs = require('fs');
const path = require('path');
const { pool } = require('../../config/database');

const runMigration = async () => {
    try {
        console.log('📂 Leyendo archivo de esquema...');
        const schemaPath = path.join(__dirname, '../../database/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        
        console.log('🔄 Separando statements SQL...');
        // Separar por punto y coma, pero ignorar los que están dentro de funciones
        const statements = schema
            .split(';')
            .map(stmt => stmt.trim())
            .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
        
        console.log(`📊 Encontrados ${statements.length} statements para ejecutar`);
        
        const client = await pool.connect();
        
        try {
            for (let i = 0; i < statements.length; i++) {
                const statement = statements[i];
                if (statement.trim()) {
                    console.log(`⚡ Ejecutando statement ${i + 1}/${statements.length}...`);
                    await client.query(statement);
                }
            }
            
            console.log('✅ Migración ejecutada exitosamente');
        } finally {
            client.release();
        }
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error ejecutando migración:', error.message);
        console.error('📍 Posición del error:', error.position);
        process.exit(1);
    }
};

runMigration();