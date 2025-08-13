const express = require('express');
const { pool } = require('../../../config/database');
const { authenticateToken, requireOwnership } = require('../middleware/auth');
const router = express.Router();
const multer = require('multer');
const fs = require('fs');
const path = require('path');


// Obtener todos los estudiantes (ruta pública para admins)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                id_student,
                name,
                email,
                status,
                balance,
                signupdate,
                created_at
            FROM student 
            ORDER BY created_at DESC
        `);
        
        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        //console.erroror('Error obteniendo estudiantes:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Obtener perfil del usuario autenticado (RUTA PROTEGIDA)
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        //console.log('entro aqui');
        // El middleware ya nos da la información del usuario
        const studentData = await pool.query(`
    SELECT 
        s.id_student,
        s.name,
        s.email,
        s.birthdate,
        s.status,
        s.balance,
        s.signupdate,
        s.readprivatepolicy,
        s.readusageterms,
        s.created_at,
        s.updated_at,
        s.useravatar,
        u.confirmed_at
    FROM student s
    LEFT JOIN users u ON s.id_student = u.id_student
    WHERE s.id_student = $1
`, [req.user.studentId]);



        if (studentData.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Perfil no encontrado'
            });
        }

        res.json({
            success: true,
            data: studentData.rows[0]
        });

    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Solo se permiten imágenes JPEG o PNG'));
    },
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Actualizar perfil del usuario autenticado (RUTA PROTEGIDA)
router.put('/profile', authenticateToken, upload.single('userAvatar'), async (req, res) => {
    const client = await pool.connect();
    try {
        const { name, birthdate } = req.body;
        let userAvatar = null;

        // Convert uploaded file to Base64
        if (req.file) {
            const mimeType = req.file.mimetype; // e.g., image/png
            const base64Data = req.file.buffer.toString('base64');
            userAvatar = `data:${mimeType};base64,${base64Data}`;
        }

        //console.log('User data:', req.user);

        // Validaciones básicas
        if (name && (name.trim().length < 2 || name.trim().length > 100)) {
            return res.status(400).json({
                success: false,
                error: 'El nombre debe tener entre 2 y 100 caracteres'
            });
        }

        if (birthdate) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(birthdate) || isNaN(Date.parse(birthdate))) {
                return res.status(400).json({
                    success: false,
                    error: 'La fecha de nacimiento debe tener un formato válido (YYYY-MM-DD)'
                });
            }
        }

        // Construir query dinámicamente
        const updates = [];
        const values = [];
        let paramCount = 1;

        if (name) {
            updates.push(`name = $${paramCount}`);
            values.push(name.trim());
            paramCount++;
        }

        if (birthdate) {
            updates.push(`birthdate = $${paramCount}`);
            values.push(birthdate);
            paramCount++;
        }

        if (userAvatar) {
            updates.push(`userAvatar = $${paramCount}`);
            values.push(userAvatar);
            paramCount++;
        }

        if (updates.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'No hay datos para actualizar'
            });
        }

        updates.push(`updated_at = NOW()`);
        values.push(req.user.studentId);

        const query = `
            UPDATE student 
            SET ${updates.join(', ')}
            WHERE id_student = $${paramCount}
            RETURNING *
        `;

        await client.query('BEGIN');
        const result = await client.query(query, values);

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                error: 'Estudiante no encontrado'
            });
        }

        await client.query(`
            INSERT INTO ai42_student_histories (student_id, session_id, message)
            VALUES ($1, $2, $3)
        `, [
            req.user.studentId,
            'profile_update_' + req.user.studentId,
            JSON.stringify({
                action: 'profile_updated',
                studentId: req.user.studentId,
                updatedFields: updates.slice(0, -1),
                timestamp: new Date().toISOString()
            })
        ]);

        await client.query('COMMIT');

        res.json({
            success: true,
            message: 'Perfil actualizado exitosamente',
            data: result.rows[0]
        });

    } catch (error) {
        await client.query('ROLLBACK');
        //console.erroror('Error actualizando perfil:', error);
        res.status(500).json({
            success: false,
            error: error.message.includes('Solo se permiten') ? error.message : 'Error interno del servidor'
        });
    } finally {
        client.release();
    }
});


// Obtener historial de actividad del usuario (RUTA PROTEGIDA)
router.get('/activity', authenticateToken, async (req, res) => {
    try {
        const activities = await pool.query(`
            SELECT session_id, message, id_history as id
            FROM ai42_student_histories 
            WHERE session_id LIKE '%' || $1 || '%'
            ORDER BY id_history DESC
            LIMIT 50
        `, [req.user.studentId]);

        res.json({
            success: true,
            count: activities.rows.length,
            data: activities.rows
        });

    } catch (error) {
        //console.erroror('Error obteniendo actividad:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Obtener un estudiante específico por ID (RUTA PROTEGIDA CON OWNERSHIP)
router.get('/:id', authenticateToken, requireOwnership('id'), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                s.id_student,
                s.name,
                s.email,
                s.birthdate,
                s.status,
                s.balance,
                s.signupdate,
                s.created_at,
                s.updated_at
            FROM student s
            WHERE s.id_student = $1
        `, [req.params.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Estudiante no encontrado'
            });
        }

        res.json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        //console.erroror('Error obteniendo estudiante:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Ruta de prueba (mantener)
router.get('/test', (req, res) => {
    res.json({
        message: '✅ Ruta de estudiantes funcionando',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;