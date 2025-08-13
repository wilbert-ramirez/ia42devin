const { pool } = require('./config/database');

const createRolesTables = async () => {
    try {
        console.log('👥 Creando sistema de roles...');
        
        // 1. Crear tabla de roles
        await pool.query(`
            CREATE TABLE IF NOT EXISTS roles (
                id_role SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                description TEXT,
                permissions JSONB DEFAULT '[]',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);
        
        // 2. Crear tabla de relación usuario-rol
        await pool.query(`
            CREATE TABLE IF NOT EXISTS user_roles (
                id SERIAL PRIMARY KEY,
                user_id UUID NOT NULL,
                role_id INTEGER NOT NULL,
                assigned_by UUID,
                assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMPTZ,
                is_active BOOLEAN DEFAULT true,
                CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id_role) ON DELETE CASCADE,
                CONSTRAINT fk_user_roles_assigned_by FOREIGN KEY (assigned_by) REFERENCES users(id),
                CONSTRAINT unique_active_user_role UNIQUE (user_id, role_id)
            )
        `);
        
        // 3. Crear índices
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);
            CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role_id);
            CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active);
            CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
        `);
        
        // 4. Insertar roles básicos
        console.log('📝 Insertando roles básicos...');
        
        await pool.query(`
            INSERT INTO roles (name, description, permissions) VALUES
            (
                'superadmin',
                'Administrador principal con acceso total al sistema',
                '["*"]'
            ),
            (
                'admin',
                'Administrador con permisos de gestión general',
                '["users.read", "users.write", "courses.read", "courses.write", "students.read", "students.write", "reports.read"]'
            ),
            (
                'instructor',
                'Instructor que puede gestionar sus cursos asignados',
                '["courses.read", "courses.write_own", "students.read", "progress.read", "progress.write"]'
            ),
            (
                'student',
                'Estudiante con acceso básico a cursos y perfil',
                '["profile.read", "profile.write", "courses.read", "courses.enroll", "progress.read_own"]'
            ),
            (
                'support',
                'Personal de soporte técnico',
                '["users.read", "students.read", "tickets.read", "tickets.write"]'
            )
            ON CONFLICT (name) DO NOTHING
        `);
        
        // 5. Asignar rol 'student' a todos los usuarios existentes
        console.log('👤 Asignando rol student a usuarios existentes...');
        
        await pool.query(`
            INSERT INTO user_roles (user_id, role_id)
            SELECT u.id, r.id_role
            FROM users u
            CROSS JOIN roles r
            WHERE r.name = 'student'
            AND u.status = 'confirmed'
            ON CONFLICT (user_id, role_id) DO NOTHING
        `);
        
        console.log('✅ Sistema de roles creado exitosamente');
        console.log('📊 Roles disponibles:');
        
        const roles = await pool.query('SELECT name, description FROM roles ORDER BY id_role');
        roles.rows.forEach(role => {
            console.log(`   - ${role.name}: ${role.description}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

createRolesTables();