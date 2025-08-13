const { pool } = require('./config/database');

const assignSuperAdmin = async () => {
    try {
        const adminId = '209dbe6a-1a9f-4aba-9fd5-3c5b723e6086';
        
        // Asignar rol superadmin
        await pool.query(`
            INSERT INTO user_roles (user_id, role_id)
            SELECT $1, id_role 
            FROM roles 
            WHERE name = 'superadmin'
            ON CONFLICT (user_id, role_id) DO NOTHING
        `, [adminId]);
        
        console.log('✅ Rol superadmin asignado exitosamente');
        
        // Verificar roles del admin
        const roles = await pool.query(`
            SELECT r.name, r.permissions
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id_role
            WHERE ur.user_id = $1 AND ur.is_active = true
        `, [adminId]);
        
        console.log('👑 Roles del admin:');
        roles.rows.forEach(role => {
            console.log(`   - ${role.name}`);
        });
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

assignSuperAdmin();