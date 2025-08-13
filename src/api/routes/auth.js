const express = require("express");
const { registerSchema, loginSchema } = require("../../lib/validators");
const AuthService = require("../services/AuthService");
const { generateJWT } = require("../../lib/auth");
const { pool } = require("../../../config/database");

const { authenticateToken } = require("../middleware/auth");
const crypto = require("crypto");

const router = express.Router();

// Registro de usuario
router.post("/register", async (req, res) => {
  try {
    //console.log('📥 === INICIO DEBUG REGISTRO ===');
    //console.log('📥 Request body received:', req.body);
    //console.log('📥 Body keys:', Object.keys(req.body));
    //console.log('📥 Body values types:', Object.keys(req.body).map(key => `${key}: ${typeof req.body[key]}`));

    // Validar datos de entrada
    //console.log('🔍 Validating with registerSchema...');
    const { error, value } = registerSchema.validate(req.body);

    //console.log('🔍 Validation error:', error);
    //console.log('🔍 Validation value:', value);

    if (error) {
      //console.log('❌ VALIDATION FAILED:');
      //console.log('❌ Error details:', JSON.stringify(error.details, null, 2));

      return res.status(400).json({
        success: false,
        error: "Datos de registro inválidos",
        details: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
          value: detail.context?.value,
        })),
      });
    }

    //console.log('✅ Validation passed! Proceeding to AuthService...');

    // Registrar usuario
    const result = await AuthService.register(value);

    //console.log('✅ AuthService result:', result);
    //console.log('📥 === FIN DEBUG REGISTRO ===');

    res.status(201).json({
      success: true,
      message: result.message,
      data: {
        emailSent: result.emailSent,
      },
    });
  } catch (error) {
    /* //console.erroror('❌ === ERROR EN REGISTRO ===');
       //console.erroror('❌ Error stack:', error.stack);
        //console.erroror('❌ Error message:', error.message);
        //console.erroror('❌ Error object:', error);*/

    res.status(400).json({
      success: false,
      error: error.message || "Error en el registro",
    });
  }
});

// Login de usuario
router.post("/login", async (req, res) => {
  try {
    // Validar datos de entrada
    const { error, value } = loginSchema.validate(req.body);

    if (error) {
      return res.status(400).json({
        success: false,
        error: "Datos de login inválidos",
        details: error.details.map((detail) => ({
          field: detail.path.join("."),
          message: detail.message,
        })),
      });
    }

    const { email, password } = value;
    const ipAddress = req.ip || req.connection.remoteAddress;

    // Intentar login
    const result = await AuthService.login(email, password, ipAddress);
    if (result.success) {
      // Generar JWT token
      const token = generateJWT({
        userId: result.user.id,
        studentId: result.user.studentId,
        email: result.user.email,
      });

      // Insert into studentlog
      await pool.query(
        `
        INSERT INTO studentlog (id_student, status, logdate, details)
        VALUES ($1, 'Login', NOW(), $2)
      `,
        [
          result.user.studentId,
          JSON.stringify({
            action: "user_login",
            email: result.user.email,
            ip_address: ipAddress,
            timestamp: new Date(),
          }),
        ]
      );

      res.json({
        success: true,
        message: "Login exitoso",
        data: {
          token,
          user: result.user,
        },
      });
    }
  } catch (error) {
    ////console.erroror('Error en login:', error);

    // Diferentes códigos de estado según el error
    let statusCode = 401;
    if (error.message.includes("bloqueada")) {
      statusCode = 423; // Locked
    } else if (error.message.includes("no confirmada")) {
      statusCode = 403; // Forbidden
    }

    res.status(statusCode).json({
      success: false,
      error: error.message || "Error en el login",
      needsConfirmation: error.message.includes("no confirmada"),
    });
  }
});

// Confirmar email
router.post("/confirm-email", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Token de confirmación requerido",
      });
    }

    // Buscar usuario con el token
    const result = await pool.query(
      `
            SELECT id, email FROM users 
            WHERE confirmation_token = $1 
            AND status = 'pending'
            AND confirmation_sent_at > NOW() - INTERVAL '24 hours'
        `,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Token inválido o expirado",
      });
    }

    const user = result.rows[0];

    // Confirmar cuenta
    await pool.query(
      `
            UPDATE users 
            SET status = 'confirmed', confirmed_at = NOW(), confirmation_token = NULL
            WHERE id = $1
        `,
      [user.id]
    );

    // Actualizar estudiante
    await pool.query(
      `
            UPDATE student 
            SET status = 'Active' 
            WHERE id_student = $1
        `,
      [user.id]
    );

    // Registrar en log
    await pool.query(
      `
            INSERT INTO studentlog (id_student, status, logdate, details)
            VALUES ($1, 'EmailConfirmed', NOW(), $2)
        `,
      [
        user.id,
        JSON.stringify({
          action: "email_confirmed",
          email: user.email,
        }),
      ]
    );

    res.json({
      success: true,
      message: "Email confirmado exitosamente. Ya puedes iniciar sesión.",
    });
  } catch (error) {
    //console.erroror('Error confirmando email:', error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
});

// Reenviar email de confirmación
router.post("/resend-confirmation", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email requerido",
      });
    }

    // Buscar usuario pendiente
    const result = await pool.query(
      `
            SELECT u.id, u.email, s.name 
            FROM users u
            LEFT JOIN student s ON u.id_student = s.id_student
            WHERE u.email = $1 AND u.status = 'pending'
        `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No se encontró una cuenta pendiente con este email",
      });
    }

    const user = result.rows[0];
    const newToken = require("../../lib/auth").generateEmailToken();

    // Actualizar token
    await pool.query(
      `
            UPDATE users 
            SET confirmation_token = $1, confirmation_sent_at = NOW()
            WHERE id = $2
        `,
      [newToken, user.id]
    );

    // Enviar nuevo email
    const emailSent =
      await require("../services/EmailService").sendConfirmationEmail(
        user.email,
        newToken,
        user.name
      );

    res.json({
      success: true,
      message: "Se ha enviado un nuevo email de confirmación",
      emailSent,
    });
  } catch (error) {
    //console.erroror('Error reenviando confirmación:', error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
});

// ENDPOINT: Check email verification status
router.post("/check-verification-status", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email requerido",
      });
    }

    // Query to check user verification status
    const result = await pool.query(
      `
            SELECT status, email_confirmed, confirmed_at
            FROM users 
            WHERE email = $1
        `,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Usuario no encontrado",
      });
    }

    const user = result.rows[0];

    res.json({
      success: true,
      verified: user.status === "confirmed",
      confirmedAt: user.confirmed_at,
      message:
        user.status === "confirmed"
          ? "Email verificado"
          : "Email no verificado",
    });
  } catch (error) {
    //console.erroror('❌ Error checking verification status:', error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
});

// Ruta de prueba (mantener)
router.get("/test", (req, res) => {
  res.json({
    message: "✅ Ruta de autenticación funcionando",
    timestamp: new Date().toISOString(),
  });
});

// Solicitar recuperación de password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: "Email requerido",
      });
    }

    // Buscar usuario confirmado
    const result = await pool.query(
      `
            SELECT u.id, u.email, s.name, u.id_student
            FROM users u
            LEFT JOIN student s ON u.id_student = s.id_student
            WHERE u.email = $1 AND u.status = 'confirmed'
        `,
      [email]
    );

    // Siempre responder exitosamente por seguridad (no revelar si el email existe)
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        message: "Si el email existe, se ha enviado un enlace de recuperación",
      });
    }

    const user = result.rows[0];
    const resetToken = require("../../lib/auth").generatePasswordResetToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    // Guardar token de recuperación
    await pool.query(
      `
            INSERT INTO password_resets (id_student, token, expires_at)
            VALUES ($1, $2, $3)
        `,
      [user.id, resetToken, expiresAt]
    );

    // Enviar email de recuperación
    const emailSent =
      await require("../services/EmailService").sendPasswordResetEmail(
        user.email,
        resetToken,
        user.name
      );

    await pool.query(
      `
    INSERT INTO ai42_student_histories (student_id, session_id, message)
    VALUES ($1, $2, $3)

    
`,
      [
        user.id_student,
        "password_reset_" + user.id + "_" + Date.now(),
        JSON.stringify({
          action: "password_reset_requested",
          email: user.email,
          timestamp: new Date(),
          emailSent: !!emailSent, // asegura que sea true o false
        }),
      ]
    );

    res.json({
      success: true,
      message: "Si el email existe, se ha enviado un enlace de recuperación",
      emailSent,
    });
  } catch (error) {
    //console.erroror('Error en forgot-password:', error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
});

// Validar token de reset
router.post("/validate-reset-token", async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Token requerido",
      });
    }

    // Buscar token válido y no usado
    const result = await pool.query(
      `
            SELECT pr.id_reset, pr.id_student, u.email, s.name
            FROM password_resets pr
            JOIN users u ON pr.id_student = u.id
            LEFT JOIN student s ON u.id_student = s.id_student
            WHERE pr.token = $1 
            AND pr.expires_at > NOW()
            AND pr.used_at IS NULL
        `,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Token inválido o expirado",
      });
    }

    res.json({
      success: true,
      message: "Token válido",
      data: {
        email: result.rows[0].email,
        name: result.rows[0].name,
      },
    });
  } catch (error) {
    //console.erroror('Error validando token:', error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
});

// Restablecer password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: "Token y nueva contraseña requeridos",
      });
    }

    // Validar nueva contraseña
    const { validatePassword } = require("../../lib/validators");
    const passwordValidation = validatePassword(newPassword);

    if (!passwordValidation.isValid) {
      return res.status(400).json({
        success: false,
        error: "Contraseña no válida",
        details: passwordValidation.errors,
      });
    }

    // Buscar token válido
    const result = await pool.query(
      `
            SELECT pr.id, pr.id_student, u.email
            FROM password_resets pr
            JOIN users u ON pr.id_student = u.id
            WHERE pr.token = $1 
            AND pr.expires_at > NOW()
            AND pr.used_at IS NULL
        `,
      [token]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Token inválido o expirado",
      });
    }

    const resetData = result.rows[0];

    // Hashear nueva contraseña
    const newPasswordHash =
      await require("../../lib/auth").hashPassword(newPassword);

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Actualizar contraseña
      await client.query(
        `
                UPDATE users 
                SET password_hash = $1, updated_at = NOW()
                WHERE id = $2
            `,
        [newPasswordHash, resetData.id_student]
      );

      // Marcar token como usado
      await client.query(
        `
                UPDATE password_resets 
                SET used_at = NOW()
                WHERE id = $1
            `,
        [resetData.id_reset]
      );

      // Registrar en log
      await client.query(
        `
    INSERT INTO ai42_student_histories (student_id, session_id, message)
    VALUES ($1, $2, $3)
`,
        [
          resetData.id_student,
          "password_changed_" + resetData.id_student + "_" + Date.now(),
          JSON.stringify({
            action: "password_reset_completed",
            email: resetData.email,
            timestamp: new Date(),
          }),
        ]
      );

      // Limpiar intentos fallidos de login
      await client.query(
        `
                DELETE FROM login_attempts WHERE email = $1
            `,
        [resetData.email]
      );

      await client.query("COMMIT");

      res.json({
        success: true,
        message:
          "Contraseña restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.",
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    //console.erroror('Error restableciendo password:', error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
});

// Agregar al final de src/api/routes/auth.js (antes de module.exports)

// ENDPOINT: Limpiar usuario específico
router.delete("/cleanup/:email", async (req, res) => {
  try {
    // Solo en desarrollo
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        error: "Endpoint no disponible en producción",
      });
    }

    const { email } = req.params;
    const { deleteAuth = true } = req.query; // ?deleteAuth=true/false

    //console.log(`🧹 Limpiando usuario: ${email} (deleteAuth: ${deleteAuth})`);

    // Usar tu función SQL
    const result = await pool.query(
      `
            SELECT clean_student_by_email_with_log($1, $2) as log_result
        `,
      [email, deleteAuth === "true"]
    );

    const logResult = result.rows[0]?.log_result || "No result";

    //console.log('🧹 Resultado de limpieza:\n', logResult);

    res.json({
      success: true,
      message: "Usuario limpiado exitosamente",
      email: email,
      deleteAuth: deleteAuth === "true",
      log: logResult,
    });
  } catch (error) {
    //console.erroror('❌ Error limpiando usuario:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      email: req.params.email,
    });
  }
});

// ENDPOINT: Listar usuarios activos
router.get("/list-users", async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        error: "Endpoint no disponible en producción",
      });
    }

    const result = await pool.query(`SELECT * FROM list_active_users()`);

    res.json({
      success: true,
      users: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    //console.erroror('❌ Error listando usuarios:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ENDPOINT: Contar registros de un usuario
router.get("/count-records/:email", async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        error: "Endpoint no disponible en producción",
      });
    }

    const { email } = req.params;

    const result = await pool.query(
      `
            SELECT * FROM count_user_records($1)
        `,
      [email]
    );

    const records = result.rows.reduce((acc, row) => {
      acc[row.tabla] = parseInt(row.cantidad);
      return acc;
    }, {});

    res.json({
      success: true,
      email: email,
      records: records,
      total: Object.values(records).reduce(
        (sum, count) => sum + (count > 0 ? count : 0),
        0
      ),
    });
  } catch (error) {
    //console.erroror('❌ Error contando registros:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ENDPOINT: Limpiar todos los usuarios de prueba comunes
router.delete("/cleanup-test-users", async (req, res) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({
        success: false,
        error: "Endpoint no disponible en producción",
      });
    }

    //console.log('🧹 Iniciando limpieza masiva de usuarios de prueba...');

    // Emails de prueba comunes
    const testEmails = [
      "test@test.com",
      "prueba@test.com",
      "demo@ia42.com",
      "wilber.ramirez@gmail.com",
      "juan@test.com",
      "admin@test.com",
      "user@test.com",
    ];

    const results = [];

    for (const email of testEmails) {
      try {
        //console.log(`🧹 Procesando: ${email}`);

        const result = await pool.query(
          `
                    SELECT clean_student_by_email_with_log($1, $2) as log_result
                `,
          [email, true]
        ); // true = eliminar de auth también

        const logResult = result.rows[0]?.log_result || "No result";

        results.push({
          email,
          status: "success",
          log: logResult,
        });

        //console.log(`✅ Completado: ${email}`);
      } catch (error) {
        results.push({
          email,
          status: "error",
          error: error.message,
        });
        //console.log(`❌ Error con ${email}:`, error.message);
      }
    }

    //console.log('🧹 Limpieza masiva completada');

    res.json({
      success: true,
      message: "Limpieza masiva de usuarios de prueba completada",
      processed: testEmails.length,
      results: results,
    });
  } catch (error) {
    //console.erroror('❌ Error en limpieza masiva:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
// Agregar este endpoint al archivo src/api/routes/auth.js

// Endpoint de diagnóstico
router.get("/diagnose/:email", async (req, res) => {
  try {
    const { email } = req.params;

    if (!email || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        error: "Email válido requerido",
      });
    }

    const result = await pool.query("SELECT diagnose_user_cleanup($1) as log", [
      email,
    ]);

    res.json({
      success: true,
      log: result.rows[0].log,
    });
  } catch (error) {
    //console.erroror('❌ Error en diagnóstico:', error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor durante el diagnóstico",
      details: error.message,
    });
  }
});

// Endpoint de limpieza mejorada
router.delete("/cleanup-enhanced/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const { deleteAuth = "false", cleanOrphans = "true" } = req.query;

    if (!email || !email.includes("@")) {
      return res.status(400).json({
        success: false,
        error: "Email válido requerido",
      });
    }

    const deleteAuthBool = deleteAuth.toLowerCase() === "true";
    const cleanOrphansBool = cleanOrphans.toLowerCase() === "true";

    const result = await pool.query(
      "SELECT clean_student_by_email_enhanced($1, $2, $3) as log",
      [email, deleteAuthBool, cleanOrphansBool]
    );

    res.json({
      success: true,
      message: `Limpieza ${deleteAuthBool ? "completa" : "parcial"} ejecutada para ${email}`,
      log: result.rows[0].log,
    });
  } catch (error) {
    //console.erroror('❌ Error en limpieza mejorada:', error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor durante la limpieza",
      details: error.message,
    });
  }
});

// ========================================
// 🆕 LOGOUT SEGURO - IA42
// ========================================

/**
 * POST /auth/logout - Logout seguro con invalidación de tokens
 */
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    //console.log('🚪 === LOGOUT SEGURO ===');
    //console.log('🚪 Usuario:', req.user?.email);
    //console.log('🚪 IP:', req.ip);

    const { logoutAll = false, reason = "user_logout" } = req.body;

    // Obtener token del header
    const authHeader = req.headers.authorization;
    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.substring(7)
        : null;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: "Token requerido para logout seguro",
        code: "MISSING_TOKEN",
      });
    }

    // Hash del token para blacklist
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    // Decodificar token para obtener expiración
    const jwt = require("jsonwebtoken");
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const expiresAt = new Date(decoded.exp * 1000);

    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      if (logoutAll) {
        //console.log('🚪 Logout de TODAS las sesiones');

        // Incrementar token_version para invalidar todos los tokens
        await client.query(
          `
                    UPDATE users 
                    SET token_version = COALESCE(token_version, 0) + 1,
                        updated_at = NOW()
                    WHERE id = $1
                `,
          [req.user.id]
        );

        //console.log('✅ Todos los tokens invalidados');
      } else {
        //console.log('🚪 Logout de esta sesión');

        // Agregar token a blacklist
        await client.query(
          `
                    INSERT INTO token_blacklist (
                        token_hash, user_id, reason, expires_at, ip_address, user_agent
                    ) VALUES ($1, $2, $3, $4, $5, $6)
                    ON CONFLICT (token_hash) DO UPDATE SET
                        blacklisted_at = NOW()
                `,
          [
            tokenHash,
            req.user.id,
            reason,
            expiresAt,
            req.ip,
            req.headers["user-agent"],
          ]
        );

        //console.log('✅ Token en blacklist');
      }

      // Log del logout
      await client.query(
        `
                INSERT INTO ai42_student_histories (session_id, message)
                VALUES ($1, $2)
            `,
        [
          "logout_" + req.user.id + "_" + Date.now(),
          JSON.stringify({
            action: "user_logout",
            user_id: req.user.id,
            email: req.user.email,
            logout_type: logoutAll ? "all_sessions" : "current_session",
            reason: reason,
            ip_address: req.ip,
            timestamp: new Date(),
          }),
        ]
      );

      // Insert into studentlog
      await pool.query(
        `
        INSERT INTO studentlog (id_student, status, logdate, details)
        VALUES ($1, 'user_logout', NOW(), $2)
      `,
        [
           req.user,
          JSON.stringify({
            action: "user_logout",
            email: req.user.email,
            ip_address: req.ip,
            timestamp: new Date(),
          }),
        ]
      );

      await client.query("COMMIT");
      //console.log('✅ Logout completado');

      res.json({
        success: true,
        message: logoutAll
          ? "Sesión cerrada en todos los dispositivos"
          : "Sesión cerrada exitosamente",
        data: {
          logout_type: logoutAll ? "all_sessions" : "current_session",
          timestamp: new Date(),
        },
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    //console.erroror('❌ Error en logout:', error);

    res.status(500).json({
      success: false,
      error: "Error interno durante el logout",
      code: "LOGOUT_ERROR",
    });
  }
});

/**
 * GET /auth/sessions - Ver sesiones activas
 */
router.get("/sessions", authenticateToken, async (req, res) => {
  try {
    const sessions = await pool.query(
      `
            SELECT 
                l.login as started_at,
                l.device,
                l.location as ip_address,
                CASE 
                    WHEN l.login > NOW() - INTERVAL '30 minutes' THEN 'active'
                    WHEN l.login > NOW() - INTERVAL '24 hours' THEN 'recent'
                    ELSE 'old'
                END as status
            FROM login l
            WHERE l.id_student = $1
            ORDER BY l.login DESC
            LIMIT 10
        `,
      [req.user.id]
    );

    res.json({
      success: true,
      data: {
        sessions: sessions.rows,
        count: sessions.rows.length,
      },
    });
  } catch (error) {
    //console.erroror('Error obteniendo sesiones:', error);
    res.status(500).json({
      success: false,
      error: "Error obteniendo sesiones",
    });
  }
});

module.exports = router;
