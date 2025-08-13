const { pool } = require('../../../config/database');
const { hashPassword, verifyPassword, generateEmailToken, generatePasswordResetToken } = require('../../lib/auth');
const EmailService = require('./EmailService');

class AuthService {
    
    // Verificar si email ya existe
    async emailExists(email) {
        const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        return result.rows.length > 0;
    }

    // Registrar nuevo usuario
    async register(userData) {
        const { 
            name, 
            email, 
            password, 
            readusageterms = false, 
            readprivatepolicy = false,
            birthdate = null  // Opcional, por defecto null
        } = userData;
        
        try {
            // Verificar si email ya existe
            if (await this.emailExists(email)) {
                throw new Error('Ya existe una cuenta con este correo electrónico');
            }

            // Hashear password
            const passwordHash = await hashPassword(password);
            const confirmationToken = generateEmailToken();
            const confirmationSentAt = new Date();

            // Iniciar transacción
            const client = await pool.connect();
            
            try {
                await client.query('BEGIN');

                // Crear usuario
                const userResult = await client.query(`
                    INSERT INTO users (email, password_hash, confirmation_token, confirmation_sent_at, status)
                    VALUES ($1, $2, $3, $4, 'pending')
                    RETURNING id
                `, [email, passwordHash, confirmationToken, confirmationSentAt]);

                const userId = userResult.rows[0].id;

                // Crear estudiante usando el mismo UUID - con los nuevos campos
                const studentResult = await client.query(`
                    INSERT INTO student (
                        id_student, 
                        name, 
                        email, 
                        birthdate,
                        readusageterms,
                        readprivatepolicy,
                        status,
                        signupdate
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, 'Pending Confirmation', NOW())
                    RETURNING id_student
                `, [userId, name, email, birthdate, readusageterms, readprivatepolicy]);

                // Actualizar la relación en users
                await client.query(`
                    UPDATE users SET id_student = $1 WHERE id = $1
                `, [userId]);

                // Registrar en studentlog con más detalles
                await client.query(`
                    INSERT INTO studentlog (id_student, status, logdate, details)
                    VALUES ($1, 'handle_new_user', NOW(), $2)
                `, [userId, JSON.stringify({
                    action: 'user_registered',
                    email: email,
                    name: name,
                    has_birthdate: !!birthdate,
                    terms_accepted: readusageterms,
                    privacy_accepted: readprivatepolicy,
                    confirmation_token_sent: true,
                    registration_source: 'web'
                })]);

                
                await client.query('COMMIT');

                // Enviar email de confirmación
                const emailSent = await EmailService.sendConfirmationEmail(email, confirmationToken,  name);
                
                if (emailSent) {
                    // Actualizar que el email fue enviado
                    await pool.query(`
                        UPDATE users 
                        SET confirmation_sent_at = NOW() 
                        WHERE id = $1
                    `, [userId]);
                }

                return {
                    success: true,
                    message: 'Registro exitoso. Se ha enviado un correo de confirmación a tu email.',
                    userId,
                    emailSent,
                    user: {
                        id: userId,
                        name,
                        email,
                        status: 'pending'
                    }
                };

            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }

        } catch (error) {
            throw error;
        }
    }

    // Login de usuario
    async login(email, password, ipAddress = null) {
        try {
            // Verificar intentos fallidos
            await this.checkLoginAttempts(email);

            // Buscar usuario con más campos del estudiante
            const userResult = await pool.query(`
                SELECT u.id, u.email, u.password_hash, u.status, u.confirmed_at,
                       s.id_student, s.name, s.status as student_status, s.birthdate,
                       s.readusageterms, s.readprivatepolicy, s.balance
                FROM users u
                LEFT JOIN student s ON u.id_student = s.id_student
                WHERE u.email = $1
            `, [email]);

            if (userResult.rows.length === 0) {
                await this.recordFailedAttempt(email, ipAddress);
                throw new Error('Credenciales inválidas');
            }

            const user = userResult.rows[0];

            // Verificar password
            const isValidPassword = await verifyPassword(password, user.password_hash);
            
            if (!isValidPassword) {
                await this.recordFailedAttempt(email, ipAddress);
                throw new Error('Credenciales inválidas');
            }

            // Verificar si la cuenta está confirmada
            if (user.status === 'pending') {
                throw new Error('Cuenta no confirmada. Revisa tu email o solicita un nuevo enlace de confirmación.');
            }

            // Login exitoso - limpiar intentos fallidos
            await this.clearFailedAttempts(email);

            // Registrar login
            await pool.query(`
                INSERT INTO login (id_student, login, device, location)
                VALUES ($1, NOW(), $2, $3)
            `, [user.id_student, 'Web Browser', ipAddress || 'Unknown']);

            // Registrar en studentlog
            await pool.query(`
                INSERT INTO studentlog (id_student, status, logdate, details)
                VALUES ($1, 'Login', NOW(), $2)
            `, [user.id_student, JSON.stringify({
                action: 'user_login',
                ip_address: ipAddress,
                device: 'Web Browser'
            })]);

            return {
                success: true,
                user: {
                    id: user.id,
                    studentId: user.id_student,
                    email: user.email,
                    name: user.name,
                    status: user.status,
                    birthdate: user.birthdate,/*
                    balance: user.balance || 0,*/
                    hasAcceptedTerms: user.readusageterms,
                    hasAcceptedPrivacy: user.readprivatepolicy
                }
            };

        } catch (error) {
            throw error;
        }
    }

    // Confirmar email
    async confirmEmail(token) {
        try {
            const userResult = await pool.query(`
                SELECT id, email, id_student, confirmation_token 
                FROM users 
                WHERE confirmation_token = $1 AND status = 'pending'
            `, [token]);

            if (userResult.rows.length === 0) {
                throw new Error('Token de confirmación inválido o cuenta ya confirmada');
            }

            const user = userResult.rows[0];
            
            // Iniciar transacción
            const client = await pool.connect();
            
            try {
                await client.query('BEGIN');

                // Confirmar usuario
                await client.query(`
                    UPDATE users 
                    SET status = 'confirmed', confirmed_at = NOW(), confirmation_token = NULL
                    WHERE id = $1
                `, [user.id]);

                // Actualizar estado del estudiante
                await client.query(`
                    UPDATE student 
                    SET status = 'Validated', updated_at = NOW()
                    WHERE id_student = $1
                `, [user.id_student]);

                // Registrar confirmación
                await client.query(`
                    INSERT INTO studentlog (id_student, status, logdate, details)
                    VALUES ($1, 'EmailConfirmed', NOW(), $2)
                `, [user.id_student, JSON.stringify({
                    action: 'email_confirmed',
                    email: user.email,
                    confirmed_at: new Date()
                })]);

                await client.query('COMMIT');

                return {
                    success: true,
                    message: 'Email confirmado exitosamente. Ya puedes iniciar sesión.',
                    user: {
                        id: user.id,
                        email: user.email,
                        status: 'confirmed'
                    }
                };

            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }

        } catch (error) {
            throw error;
        }
    }

    // Reenviar confirmación de email
    async resendConfirmation(email) {
        try {
            const userResult = await pool.query(`
                SELECT u.id, u.email, u.status, s.name
                FROM users u
                LEFT JOIN student s ON u.id_student = s.id_student
                WHERE u.email = $1
            `, [email]);

            if (userResult.rows.length === 0) {
                throw new Error('No se encontró una cuenta con este email');
            }

            const user = userResult.rows[0];

            if (user.status === 'confirmed') {
                throw new Error('Esta cuenta ya está confirmada');
            }

            // Generar nuevo token
            const confirmationToken = generateEmailToken();
            
            await pool.query(`
                UPDATE users 
                SET confirmation_token = $1, confirmation_sent_at = NOW()
                WHERE id = $2
            `, [confirmationToken, user.id]);

            // Enviar email
            const emailSent = await EmailService.sendConfirmationEmail(email, confirmationToken, user.name);

            return {
                success: true,
                message: 'Se ha enviado un nuevo correo de confirmación',
                emailSent
            };

        } catch (error) {
            throw error;
        }
    }

    // Verificar intentos de login fallidos
    async checkLoginAttempts(email) {
        const result = await pool.query(`
            SELECT COUNT(*) as attempts
            FROM login_attempts 
            WHERE email = $1 
            AND created_at > NOW() - INTERVAL '30 minutes'
        `, [email]);

        const attempts = parseInt(result.rows[0]?.attempts || 0);
        
        if (attempts >= 5) {
            throw new Error('Cuenta bloqueada por 30 minutos debido a múltiples intentos fallidos');
        }
    }

    // Registrar intento fallido
    async recordFailedAttempt(email, ipAddress) {
        // Primero crear la tabla si no existe
        await pool.query(`
            CREATE TABLE IF NOT EXISTS login_attempts (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) NOT NULL,
                ip_address INET,
                created_at TIMESTAMPTZ DEFAULT NOW()
            )
        `);

        await pool.query(`
            INSERT INTO login_attempts (email, ip_address)
            VALUES ($1, $2)
        `, [email, ipAddress]);
    }

    // Limpiar intentos fallidos
    async clearFailedAttempts(email) {
        await pool.query(`
            DELETE FROM login_attempts WHERE email = $1
        `, [email]);
    }

    // Actualizar perfil de estudiante
    async updateProfile(studentId, profileData) {
        try {
            const { name, birthdate } = profileData;
            
            const client = await pool.connect();
            
            try {
                await client.query('BEGIN');

                // Construir query dinámicamente
                const updates = [];
                const values = [];
                let paramCount = 1;

                if (name !== undefined) {
                    updates.push(`name = $${paramCount++}`);
                    values.push(name);
                }

                if (birthdate !== undefined) {
                    updates.push(`birthdate = $${paramCount++}`);
                    values.push(birthdate);
                }

                updates.push(`updated_at = NOW()`);
                values.push(studentId);

                const query = `
                    UPDATE student 
                    SET ${updates.join(', ')}
                    WHERE id_student = $${paramCount}
                    RETURNING *
                `;

                const result = await client.query(query, values);

                // Registrar cambio
                await client.query(`
                    INSERT INTO studentlog (id_student, status, logdate, details)
                    VALUES ($1, 'ProfileUpdated', NOW(), $2)
                `, [studentId, JSON.stringify({
                    action: 'profile_updated',
                    changes: profileData
                })]);

                await client.query('COMMIT');

                return {
                    success: true,
                    message: 'Perfil actualizado exitosamente',
                    student: result.rows[0]
                };

            } catch (error) {
                await client.query('ROLLBACK');
                throw error;
            } finally {
                client.release();
            }

        } catch (error) {
            throw error;
        }
    }
}

module.exports = new AuthService();
