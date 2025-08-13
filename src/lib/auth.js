const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Hashear password
const hashPassword = async (password) => {
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    return await bcrypt.hash(password, saltRounds);
};

// Verificar password
const verifyPassword = async (password, hashedPassword) => {
    return await bcrypt.compare(password, hashedPassword);
};

// Generar JWT token
const generateJWT = (payload) => {
    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
};

// Verificar JWT token
const verifyJWT = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        throw new Error('Token inválido');
    }
};

// Generar token de confirmación de email
const generateEmailToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Generar token de recuperación de password
const generatePasswordResetToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Validar formato de token
const isValidToken = (token) => {
    return token && typeof token === 'string' && token.length === 64;
};

module.exports = {
    hashPassword,
    verifyPassword,
    generateJWT,
    verifyJWT,
    generateEmailToken,
    generatePasswordResetToken,
    isValidToken
};

