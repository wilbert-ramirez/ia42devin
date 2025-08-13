const { pool } = require('./config/database');

const createStudentLogTable = async () => {
    try {
        console.log('📝 Creando tabla studentlog...');
        
        await pool.query(`
            CREATE TABLE IF NOT EXISTS studentlog (
                id SERIAL PRIMARY KEY,
                id_student UUID NOT NULL,
                status VARCHAR(50),
                logdate TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                details JSONB,
                CONSTRAINT fk_studentlog_student 
                    FOREIGN KEY (id_student) REFERENCES student(id_student)
            )
        `);
        
        // Crear índice para mejorar performance
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_studentlog_student 
            ON studentlog(id_student)
        `);
        
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_studentlog_date 
            ON studentlog(logdate)
        `);
        
        console.log('✅ Tabla studentlog creada exitosamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

createStudentLogTable();