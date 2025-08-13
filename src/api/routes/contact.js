const express = require('express');
const router = express.Router();
const { pool } = require('../../../config/database');

// Ruta para recibir mensajes desde la sección de contacto
router.post('/', async (req, res) => {
    const { full_name, email, message } = req.body;

    if (!full_name || !email || !message) {
        return res.status(400).json({
            success: false,
            error: 'Todos los campos son obligatorios'
        });
    }

    const subject = 'form_webapp_index'; // Subject fijo

    try {
        const result = await pool.query(`
            INSERT INTO ia42webmsj (full_name, email, subject, message)
            VALUES ($1, $2, $3, $4)
            RETURNING id, sent_at
        `, [full_name, email, subject, message]);

        return res.json({
            success: true,
            message: 'Mensaje enviado correctamente',
            data: result.rows[0]
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

module.exports = router;
