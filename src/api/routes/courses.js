const express = require('express');
const { pool } = require('../../../config/database');
const { authenticateToken, requireOwnership } = require('../middleware/auth');
const router = express.Router();

// Obtener todos los cursos
router.get('/', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                lx.id,
                lx.shortname,
                lx.description,
                lx.status,
                lx.standout,
                lxcat.name as category_name,
                lxprice.amount as price
            FROM lx 
            LEFT JOIN lx_category lxcat ON lx.id_category = lxcat.id_category
            LEFT JOIN lxprice ON lx.id_lx_price = lxprice.id_price
            WHERE lx.status = 'active'
            ORDER BY lx.standout DESC, lx.shortname
        `);
        
        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error obteniendo cursos:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});


// Obtener todos los cursos
router.get('/subscriptions', authenticateToken, async (req, res) => {
    try {
        console.warn(req.user);
        const { studentId } = req.user;

        const result = await pool.query(`
            WITH counts AS (
                SELECT 
                    COUNT(*) FILTER (WHERE sub.status = 'active' AND sub.validthru >= CURRENT_DATE) AS active_count,
                    COUNT(*) FILTER (WHERE sub.status = 'completed') AS completed_count,
                    COUNT(*) FILTER (WHERE sub.validthru < CURRENT_DATE) AS expired_count
                FROM suscription sub
                WHERE sub.id_student = $1
            )
            SELECT 
                lx.id,
                lx.shortname,
                lx.commercial_desc AS description,
                lx.status,
                lx.standout,
                lx.imagepath,
                lxcat.name AS category_name,
                lx_price.amount_monthly AS price,
                sub.id AS suscription_id,
                sub.currentprogress,
                sub.status AS status_sub,
                sub.validthru AS validthru,
                counts.active_count,
                counts.completed_count,
                counts.expired_count
            FROM suscription sub
            JOIN lx ON sub.id_lx = lx.id
            LEFT JOIN lx_category lxcat ON lx.id_category = lxcat.id_category
            LEFT JOIN lx_price ON lx.id_lx_price = lx_price.id
            CROSS JOIN counts
            WHERE lx.status = 'active' 
                AND sub.id_student = $1
            ORDER BY lx.standout DESC, lx.shortname
        `, [studentId]);
        console.warn(studentId);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Subscription not found'
            });
        }

        res.json({
            success: true,
            count: result.rows.length,
            active_count: result.rows[0].active_count,
            completed_count: result.rows[0].completed_count,
            expired_count: result.rows[0].expired_count,
            data: result.rows.map(row => ({
                id: row.id,
                shortname: row.shortname,
                description: row.description,
                status: row.status,
                standout: row.standout,
                imagepath: row.imagepath,
                category_name: row.category_name,
                price: row.price,
                suscription_id: row.suscription_id,
                currentprogress: row.currentprogress,
                status_sub: row.status_sub,
                validthru: row.validthru
            }))
        });
    } catch (error) {
        console.error('Error fetching subscription:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error'
        });
    }
});

router.get('/lx-home', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                lx.id,
                lx.shortname,
                lx.commercial_desc,
                lx.status,
                lx.standout,
                lx.imagepath,
                lxcat.name AS category_name,
                lxprice.amount_monthly AS price
            FROM lx 
            LEFT JOIN lx_category lxcat ON lx.id_lx_category = lxcat.id_category
            LEFT JOIN lx_price lxprice ON lx.id_lx_price = lxprice.id
            WHERE lx.status = 'active'
            ORDER BY lx.standout DESC, lx.shortname
        `);
        
        res.json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });
    } catch (error) {
        console.error('Error obteniendo cursos:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Verificar suscripción activa del estudiante
router.get('/suscription/:id_lx', authenticateToken, async (req, res) => {
    try {
        const { studentId } = req.user;
        const { id_lx } = req.params;

        // Validate id_lx
        if (!id_lx || isNaN(id_lx)) {
            return res.status(400).json({
                success: false,
                error: 'ID de curso inválido'
            });
        }

        const result = await pool.query(`
            SELECT 
                id,
                id_lx,
                status,
                currentprogress,
                validthru
            FROM suscription
            WHERE id_student = $1
            AND id_lx = $2
            
        `, [studentId, id_lx]);

        const hasActiveSubscription = result.rows.length > 0;

        res.json({
            success: true,
            active: hasActiveSubscription,
            data: hasActiveSubscription ? result.rows[0] : null
        });
    } catch (error) {
        console.error('Error verificando suscripción:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

router.get('/lx/:id_lx', authenticateToken, async (req, res) => {
    try {
        const { studentId } = req.user;
        const { id_lx } = req.params;
  console.warn(studentId)
  console.warn(id_lx)
        // Validate id_lx
        if (isNaN(id_lx)) {
            return res.status(400).json({
                success: false,
                error: 'ID de curso inválido'
            });
        }

        const result = await pool.query(`
            SELECT 
                s.id,
                s.id_lx,
                s.status,
                s.currentprogress,
                l.id_lx_prompt,
                l.shortname,
                l.description,
                l.wf_hookup
            FROM lx l
            JOIN suscription s ON s.id_lx = l.id
            WHERE s.id_student = $1
            AND s.id_lx = $2
            AND s.status = 'active' OR s.status = 'completed'
        `, [studentId, id_lx]);

        const hasActiveSubscription = result.rows.length > 0;

        res.json({
            success: true,
            active: hasActiveSubscription,
            data: hasActiveSubscription ? result.rows[0] : null
        });
    } catch (error) {
        console.error('Error verificando suscripción:', {
            error: error.message,
            studentId,
            id_lx
        });
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

router.get('/lxprompt/:id_lx', authenticateToken, async (req, res) => {
    try {
        const { studentId } = req.user;
        const { id_lx } = req.params;
        console.warn(studentId);
        console.warn(id_lx);

        // Validate id_lx
        if (isNaN(id_lx)) {
            return res.status(400).json({
                success: false,
                error: 'ID de curso inválido'
            });
        }

        const result = await pool.query(`
            SELECT *
            FROM lx_prompt
            WHERE id = $1
        `, [id_lx]);

        const hasPrompt = result.rows.length > 0;

        res.json({
            success: true,
            active: hasPrompt,
            data: hasPrompt ? result.rows[0] : null
        });
    } catch (error) {
        console.error('Error verificando lx_prompt:', {
            error: error.message,
            studentId,
            id_lx
        });
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// Get Course Details
router.get('/details', async (req, res) => {
  try {
    const { cursoId } = req.query;
    if (!cursoId || isNaN(cursoId)) {
      return res.status(400).json({ error: 'ID de curso inválido' });
    }

    const courseResult = await pool.query(`
      SELECT 
        lx.shortname,
        lx.description,
        lx.imagepath,
        lx.focus,
        lx.technical_desc,
        lx.commercial_desc,
        lx.standout,
        lx_price.amount_monthly AS price
      FROM lx
      LEFT JOIN lx_price ON lx.id_lx_price = lx_price.id
      WHERE lx.id = $1 AND lx.status = 'active'
    `, [cursoId]);

    if (courseResult.rows.length === 0) {
      return res.status(404).json({ error: 'Curso no encontrado o no está activo' });
    }

    const { shortname, price, description, imagepath, focus, technical_desc, commercial_desc, standout } = courseResult.rows[0];

    if (price == null) {
      return res.status(400).json({ error: 'Precio del curso no definido' });
    }

    const formattedPrice = Number(price).toFixed(2);
    if (isNaN(formattedPrice)) {
      return res.status(500).json({ error: 'El precio del curso no es un número válido' });
    }

    res.json({
      courseName: shortname,
      price: formattedPrice,
      description: description || null,
      imagePath: imagepath || null,
      focus: focus || null,
      technicalDesc: technical_desc || null,
      commercialDesc: commercial_desc || null,
      standout: standout || false
    });
  } catch (error) {
    console.error('Error fetching course details:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener detalles del curso', details: error.message });
  }
});


router.post("/opinions", async (req, res) => {
  const { id_student, stars, text, id_lx, status } = req.body;

  // Validate input
  if (!id_student || !stars || !text || !id_lx) {
    return res.status(400).json({ error: "Faltan campos obligatorios" });
  }

  // Validate stars (1-5)
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return res.status(400).json({ error: "La calificación debe estar entre 1 y 5" });
  }

  // Validate text length (mimicking database constraint)
  if (text && text.trim().length < 10) {
    return res.status(400).json({ error: "El comentario debe tener al menos 10 caracteres" });
  }

  // Validate status
  const validStatuses = ["active", "hidden", "pending_review"];
  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ error: "Estado inválido. Debe ser 'active', 'hidden' o 'pending_review'" });
  }

  try {
    const query = `
      INSERT INTO opinion (id_student, stars, text, id_lx, status, created_at)
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      RETURNING id
    `;
    const values = [id_student, stars, text, id_lx, status || "active"];

    const result = await pool.query(query, values);
    res.status(201).json({ id: result.rows[0].id, message: "Feedback creado exitosamente" });
  } catch (err) {
    console.error("Error inserting feedback:", err);
    if (err.code === "23514" && err.constraint === "opinion_text_meaningful") {
      return res.status(400).json({ error: "El comentario debe tener al menos 10 caracteres" });
    }
    if (err.code === "23514" && err.constraint === "opinion_stars_check") {
      return res.status(400).json({ error: "La calificación debe estar entre 1 y 5" });
    }
    if (err.code === "23514" && err.constraint === "opinion_status_check") {
      return res.status(400).json({ error: "Estado inválido. Debe ser 'active', 'hidden' o 'pending_review'" });
    }
    if (err.code === "23503") {
      // Foreign key violation (id_student or id_lx)
      return res.status(400).json({ error: "Estudiante o experiencia no encontrada" });
    }
    res.status(500).json({ error: "Error al guardar el feedback" });
  }
});

// Ruta de prueba (mantener)
router.get('/test', (req, res) => {
    res.json({
        message: '✅ Ruta de cursos funcionando',
        timestamp: new Date().toISOString()
    });
});

module.exports = router;