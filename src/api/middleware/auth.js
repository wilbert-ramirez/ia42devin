const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // 🆕 Para hash de tokens de blacklist
const { pool } = require('../../../config/database');

// Middleware para verificar JWT token
const authenticateToken = async (req, res, next) => {
    try {
        // Obtener token del header Authorization
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.startsWith('Bearer ') 
            ? authHeader.substring(7) 
            : null;

        if (!token) {
            return res.status(401).json({
                success: false,
                error: 'Token de acceso requerido',
                code: 'NO_TOKEN'
            });
        }

        // Verificar token JWT
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Token expirado',
                    code: 'TOKEN_EXPIRED'
                });
            }
            
            return res.status(401).json({
                success: false,
                error: 'Token inválido',
                code: 'INVALID_TOKEN'
            });
        }

        // ============================================================================
        // 🆕 VERIFICACIÓN DE BLACKLIST - CON MANEJO ROBUSTO DE ERRORES
        // ============================================================================
        try {
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
            
            // Verificar que la tabla existe antes de consultar
            const tableCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'token_blacklist'
                );
            `);
            
            if (tableCheck.rows[0].exists) {
                const blacklistCheck = await pool.query(
                    'SELECT id, reason FROM token_blacklist WHERE token_hash = $1 AND expires_at > NOW()',
                    [tokenHash]
                );

                if (blacklistCheck.rows.length > 0) {
                    const reason = blacklistCheck.rows[0].reason || 'logout';
                    return res.status(401).json({
                        success: false,
                        error: 'Token fue invalidado',
                        code: 'TOKEN_BLACKLISTED',
                        reason: reason
                    });
                }
            } else {
                //console.warn('⚠️  Tabla token_blacklist no existe - saltando verificación');
            }
        } catch (blacklistError) {
            ////console.erroror('❌ Error verificando blacklist:', blacklistError.message);
            // Continuar sin verificación de blacklist para no romper la autenticación
            //console.warn('⚠️  Continuando sin verificación de blacklist debido a error');
        }

        // ============================================================================
        // 🆕 VERIFICACIÓN DE USUARIO - CON VERIFICACIÓN DE COLUMNA token_version
        // ============================================================================
        let userQuery = `
            SELECT u.id, u.email, u.status, u.confirmed_at,
                   s.id_student, s.name, s.status as student_status, s.balance
            FROM users u
            LEFT JOIN student s ON u.id_student = s.id_student
            WHERE u.id = $1 AND u.status = 'confirmed'
        `;

        // Verificar si la columna token_version existe
        let hasTokenVersion = false;
        try {
            const columnCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'token_version'
                );
            `);
            hasTokenVersion = columnCheck.rows[0].exists;
            
            if (hasTokenVersion) {
                userQuery = `
                    SELECT u.id, u.email, u.status, u.confirmed_at, u.token_version,
                           s.id_student, s.name, s.status as student_status, s.balance
                    FROM users u
                    LEFT JOIN student s ON u.id_student = s.id_student
                    WHERE u.id = $1 AND u.status = 'confirmed'
                `;
            }
        } catch (columnError) {
            console.warn('⚠️  No se pudo verificar columna token_version:', columnError.message);
        }

        const userResult = await pool.query(userQuery, [decoded.userId]);

        if (userResult.rows.length === 0) {
            return res.status(401).json({
                success: false,
                error: 'Usuario no encontrado o inactivo',
                code: 'USER_NOT_FOUND'
            });
        }

        const user = userResult.rows[0];

        // ============================================================================
        // 🆕 VERIFICACIÓN DE TOKEN VERSION - SOLO SI LA COLUMNA EXISTE
        // ============================================================================
        if (hasTokenVersion && user.token_version !== undefined && user.token_version !== null && 
            decoded.tokenVersion !== undefined && decoded.tokenVersion !== null) {
            if (user.token_version > decoded.tokenVersion) {
                return res.status(401).json({
                    success: false,
                    error: 'Token fue invalidado globalmente',
                    code: 'TOKEN_VERSION_MISMATCH',
                    userTokenVersion: user.token_version,
                    providedTokenVersion: decoded.tokenVersion
                });
            }
        }

        // Obtener roles y permisos del usuario
        const rolesResult = await pool.query(`
            SELECT r.name as role_name, r.permissions, ur.expires_at
            FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id_role
            WHERE ur.user_id = $1 
            AND ur.is_active = true
            AND r.is_active = true
            AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
            ORDER BY r.id_role
        `, [user.id]);

        // Construir array de roles y permisos
        const userRoles = rolesResult.rows.map(row => row.role_name);
        const allPermissions = new Set();
        
        rolesResult.rows.forEach(row => {
            const permissions = Array.isArray(row.permissions) ? row.permissions : [];
            permissions.forEach(permission => allPermissions.add(permission));
        });

        // Si no tiene roles, asignar rol student por defecto
        if (userRoles.length === 0) {
            await pool.query(`
                INSERT INTO user_roles (user_id, role_id)
                SELECT $1, id_role FROM roles WHERE name = 'student'
                ON CONFLICT (user_id, role_id) DO NOTHING
            `, [user.id]);
            
            userRoles.push('student');
            allPermissions.add('profile.read');
            allPermissions.add('profile.write');
            allPermissions.add('courses.read');
            allPermissions.add('courses.enroll');
            allPermissions.add('progress.read_own');
        }

        // Agregar información del usuario al request
        req.user = {
            id: user.id,
            studentId: user.id_student,
            email: user.email,
            name: user.name,
            status: user.status,
            studentStatus: user.student_status,
            balance: parseFloat(user.balance || 0),
            roles: userRoles,
            permissions: Array.from(allPermissions),
            tokenVersion: hasTokenVersion ? (user.token_version || 0) : 0 // Solo si la columna existe
        };

        // Agregar token decodificado
        req.tokenData = decoded;

        next();

    } catch (error) {
        /*//console.erroror('❌ Error en middleware de autenticación:', error);
        //console.erroror('❌ Stack trace:', error.stack);*/
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor',
            code: 'INTERNAL_ERROR',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
};

// Middleware opcional - no falla si no hay token
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.startsWith('Bearer ') 
            ? authHeader.substring(7) 
            : null;

        if (!token) {
            req.user = null;
            return next();
        }

        // Si hay token, intentar autenticar
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // ============================================================================
        // 🆕 VERIFICACIÓN DE BLACKLIST - ROBUSTA EN OPTIONAL
        // ============================================================================
        try {
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
            
            const tableCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'token_blacklist'
                );
            `);
            
            if (tableCheck.rows[0].exists) {
                const blacklistCheck = await pool.query(
                    'SELECT id FROM token_blacklist WHERE token_hash = $1 AND expires_at > NOW()',
                    [tokenHash]
                );

                if (blacklistCheck.rows.length > 0) {
                    req.user = null;
                    return next();
                }
            }
        } catch (blacklistError) {
            ////console.erroror('❌ Error verificando blacklist en optionalAuth:', blacklistError.message);
            // En caso de error, continuar sin usuario
            req.user = null;
            return next();
        }
        
        // Query básico para usuario
        let userQuery = `
            SELECT u.id, u.email, u.status,
                   s.id_student, s.name, s.status as student_status, s.balance
            FROM users u
            LEFT JOIN student s ON u.id_student = s.id_student
            WHERE u.id = $1 AND u.status = 'confirmed'
        `;

        // Verificar si token_version existe y agregarlo a la query
        let hasTokenVersion = false;
        try {
            const columnCheck = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.columns 
                    WHERE table_name = 'users' AND column_name = 'token_version'
                );
            `);
            hasTokenVersion = columnCheck.rows[0].exists;
            
            if (hasTokenVersion) {
                userQuery = `
                    SELECT u.id, u.email, u.status, u.token_version,
                           s.id_student, s.name, s.status as student_status, s.balance
                    FROM users u
                    LEFT JOIN student s ON u.id_student = s.id_student
                    WHERE u.id = $1 AND u.status = 'confirmed'
                `;
            }
        } catch (columnError) {
            console.warn('⚠️  No se pudo verificar columna token_version en optionalAuth');
        }

        const userResult = await pool.query(userQuery, [decoded.userId]);

        if (userResult.rows.length > 0) {
            const user = userResult.rows[0];
            
            // Verificar token version solo si la columna existe
            if (hasTokenVersion && user.token_version !== undefined && user.token_version !== null && 
                decoded.tokenVersion !== undefined && decoded.tokenVersion !== null) {
                if (user.token_version > decoded.tokenVersion) {
                    req.user = null;
                    return next();
                }
            }
            
            req.user = {
                id: user.id,
                studentId: user.id_student,
                email: user.email,
                name: user.name,
                status: user.status,
                studentStatus: user.student_status,
                balance: parseFloat(user.balance || 0),
                tokenVersion: hasTokenVersion ? (user.token_version || 0) : 0
            };
        } else {
            req.user = null;
        }

        next();

    } catch (error) {
        // En middleware opcional, ignorar errores y continuar sin usuario
        console.warn('⚠️  Error en optionalAuth:', error.message);
        req.user = null;
        next();
    }
};

// Middleware para verificar roles específicos
const requireRole = (allowedRoles) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Autenticación requerida',
                    code: 'AUTH_REQUIRED'
                });
            }

            // Verificar si tiene alguno de los roles permitidos
            const hasRole = allowedRoles.some(role => req.user.roles.includes(role));
            
            // Verificar superadmin (acceso total)
            const isSuperAdmin = req.user.roles.includes('superadmin');

            if (!hasRole && !isSuperAdmin) {
                return res.status(403).json({
                    success: false,
                    error: 'Permisos insuficientes para esta acción',
                    code: 'INSUFFICIENT_PERMISSIONS',
                    requiredRoles: allowedRoles,
                    userRoles: req.user.roles
                });
            }

            next();

        } catch (error) {
            ////console.erroror('Error en middleware de roles:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    };
};

// Middleware para verificar permisos específicos
const requirePermission = (requiredPermissions) => {
    return async (req, res, next) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Autenticación requerida',
                    code: 'AUTH_REQUIRED'
                });
            }

            // Verificar superadmin (acceso total)
            if (req.user.permissions.includes('*')) {
                return next();
            }

            // Verificar si tiene todos los permisos requeridos
            const hasAllPermissions = requiredPermissions.every(permission => 
                req.user.permissions.includes(permission)
            );

            if (!hasAllPermissions) {
                return res.status(403).json({
                    success: false,
                    error: 'Permisos insuficientes para esta acción',
                    code: 'INSUFFICIENT_PERMISSIONS',
                    requiredPermissions,
                    userPermissions: req.user.permissions
                });
            }

            next();

        } catch (error) {
           // //console.erroror('Error en middleware de permisos:', error);
            res.status(500).json({
                success: false,
                error: 'Error interno del servidor'
            });
        }
    };
};

// Middleware para verificar que el usuario es dueño del recurso
const requireOwnership = (resourceIdField = 'id') => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: 'Autenticación requerida'
            });
        }

        const resourceId = req.params[resourceIdField];
        
        // Verificar si el usuario es dueño del recurso
        if (req.user.studentId !== resourceId && req.user.id !== resourceId) {
            return res.status(403).json({
                success: false,
                error: 'No tienes permisos para acceder a este recurso',
                code: 'RESOURCE_FORBIDDEN'
            });
        }

        next();
    };
};

module.exports = {
    authenticateToken,
    optionalAuth,
    requireRole,
    requirePermission,
    requireOwnership
};
