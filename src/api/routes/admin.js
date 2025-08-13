const express = require('express');
const { pool } = require('../../../config/database');
const { authenticateToken, requireRole, requirePermission } = require('../middleware/auth');
const router = express.Router();

// Todas las rutas de admin requieren autenticación
router.use(authenticateToken);

// Dashboard admin - Solo admins y superadmins
router.get('/dashboard', requireRole(['admin', 'superadmin']), async (req, res) => {
    try {
        // Obtener estadísticas generales
        const stats = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE status = 'confirmed') as total_users,
                (SELECT COUNT(*) FROM student WHERE status = 'Active') as active_students,
                (SELECT COUNT(*) FROM lx WHERE status = 'active') as active_courses,
                (SELECT COUNT(*) FROM inscriptions) as total_inscriptions,
                (SELECT COUNT(*) FROM users WHERE created_at > NOW() - INTERVAL '30 days') as new_users_month
        `);

        res.json({
            success: true,
            data: {
                statistics: stats.rows[0],
                user: {
                    name: req.user.name,
                    email: req.user.email,
                    roles: req.user.roles,
                    permissions: req.user.permissions
                }
            }
        });

    } catch (error) {
        ////console.erroror('Error en dashboard admin:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Gestión de usuarios - Solo superadmin
router.get('/users', requireRole(['superadmin']), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;

        const users = await pool.query(`
            SELECT 
                u.id, u.email, u.status, u.created_at, u.confirmed_at,
                s.name, s.status as student_status, s.balance,
                array_agg(DISTINCT r.name) as roles
            FROM users u
            LEFT JOIN student s ON u.id_student = s.id_student
            LEFT JOIN user_roles ur ON u.id = ur.user_id AND ur.is_active = true
            LEFT JOIN roles r ON ur.role_id = r.id_role AND r.is_active = true
            GROUP BY u.id, s.id_student
            ORDER BY u.created_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]);

        const total = await pool.query('SELECT COUNT(*) FROM users');

        res.json({
            success: true,
            data: users.rows,
            pagination: {
                page,
                limit,
                total: parseInt(total.rows[0].count),
                pages: Math.ceil(total.rows[0].count / limit)
            }
        });

    } catch (error) {
        //console.erroror('Error obteniendo usuarios:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Asignar rol a usuario - Solo superadmin
router.post('/users/:userId/roles', requireRole(['superadmin']), async (req, res) => {
    try {
        const { userId } = req.params;
        const { roleName } = req.body;

        if (!roleName) {
            return res.status(400).json({
                success: false,
                error: 'Nombre del rol requerido'
            });
        }

        // Verificar que el rol existe
        const roleResult = await pool.query('SELECT id_role FROM roles WHERE name = $1', [roleName]);
        
        if (roleResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Rol no encontrado'
            });
        }

        const roleId = roleResult.rows[0].id_role;

        // Asignar rol
        await pool.query(`
            INSERT INTO user_roles (user_id, role_id, assigned_by)
            VALUES ($1, $2, $3)
            ON CONFLICT (user_id, role_id) 
            DO UPDATE SET 
                is_active = true,
                assigned_by = $3,
                assigned_at = NOW()
        `, [userId, roleId, req.user.id]);

        // Registrar en log
        await pool.query(`
            INSERT INTO ai42_student_histories (session_id, message)
            VALUES ($1, $2)
        `, ['role_assigned_' + userId, JSON.stringify({
            action: 'role_assigned',
            targetUserId: userId,
            roleName: roleName,
            assignedBy: req.user.email,
            timestamp: new Date()
        })]);

        res.json({
            success: true,
            message: `Rol ${roleName} asignado exitosamente`
        });

    } catch (error) {
        //console.erroror('Error asignando rol:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Remover rol de usuario - Solo superadmin
router.delete('/users/:userId/roles/:roleName', requireRole(['superadmin']), async (req, res) => {
    try {
        const { userId, roleName } = req.params;

        // No permitir remover el último rol
        const userRoles = await pool.query(`
            SELECT COUNT(*) as role_count
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id_role
            WHERE ur.user_id = $1 AND ur.is_active = true
        `, [userId]);

        if (parseInt(userRoles.rows[0].role_count) <= 1) {
            return res.status(400).json({
                success: false,
                error: 'No se puede remover el último rol del usuario'
            });
        }

        // Remover rol
        await pool.query(`
            UPDATE user_roles 
            SET is_active = false
            WHERE user_id = $1 
            AND role_id = (SELECT id_role FROM roles WHERE name = $2)
        `, [userId, roleName]);

        res.json({
            success: true,
            message: `Rol ${roleName} removido exitosamente`
        });

    } catch (error) {
        //console.erroror('Error removiendo rol:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Obtener todos los roles disponibles - Admins y superadmins
router.get('/roles', requireRole(['admin', 'superadmin']), async (req, res) => {
    try {
        const roles = await pool.query(`
            SELECT id_role, name, description, permissions, is_active
            FROM roles
            WHERE is_active = true
            ORDER BY name
        `);

        res.json({
            success: true,
            data: roles.rows
        });

    } catch (error) {
        //console.erroror('Error obteniendo roles:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Ruta de prueba para verificar permisos
router.get('/test-permissions', requirePermission(['users.read']), (req, res) => {
    res.json({
        success: true,
        message: '✅ Tienes permisos para leer usuarios',
        user: {
            roles: req.user.roles,
            permissions: req.user.permissions
        }
    });
});

module.exports = router;