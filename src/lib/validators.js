const joi = require('joi');

// Política de password: 12 caracteres, mayúsculas, minúsculas, números y símbolos
const passwordSchema = joi.string()
    .min(12)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#+\\-_])[A-Za-z\\d@$!%*?&#+\\-_]'))
    .required()
    .messages({
        'string.min': 'La contraseña debe tener al menos 12 caracteres',
        'string.pattern.base': 'La contraseña debe contener al menos: una minúscula, una mayúscula, un número y un símbolo (@$!%*?&#+-_)',
        'any.required': 'La contraseña es requerida'
    });

// Validación de email
const emailSchema = joi.string()
    .email()
    .required()
    .messages({
        'string.email': 'Debe ser un email válido',
        'any.required': 'El email es requerido'
    });

// Validación de nombre
const nameSchema = joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede exceder 100 caracteres',
        'any.required': 'El nombre es requerido'
    });

// Validación de términos y políticas (boolean que debe ser true)
const termsSchema = joi.boolean()
    .valid(true)
    .required()
    .messages({
        'any.only': 'Debes aceptar los términos de uso',
        'any.required': 'Debes aceptar los términos de uso'
    });

const privacySchema = joi.boolean()
    .valid(true)
    .required()
    .messages({
        'any.only': 'Debes aceptar la política de privacidad',
        'any.required': 'Debes aceptar la política de privacidad'
    });

// Esquema completo de registro - CON los nuevos campos
const registerSchema = joi.object({
    name: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    readusageterms: termsSchema,
    readprivatepolicy: privacySchema
});

// Esquema de login
const loginSchema = joi.object({
    email: emailSchema,
    password: joi.string().required().messages({
        'any.required': 'La contraseña es requerida'
    }),
    rememberMe: joi.boolean().optional()
});

// Función para validar password
const validatePassword = (password) => {
    const result = passwordSchema.validate(password);
    return {
        isValid: !result.error,
        errors: result.error ? result.error.details.map(d => d.message) : []
    };
};

// Función para validar email
const validateEmail = (email) => {
    const result = emailSchema.validate(email);
    return {
        isValid: !result.error,
        errors: result.error ? result.error.details.map(d => d.message) : []
    };
};

// Debug: función para validar registro completo
const validateRegister = (data) => {
    console.log('🔍 Validating registration data:', data);
    const result = registerSchema.validate(data);
    console.log('🔍 Validation result:', result);
    return result;
};

module.exports = {
    registerSchema,
    loginSchema,
    validatePassword,
    validateEmail,
    validateRegister, // Para debugging
    passwordSchema,
    emailSchema,
    nameSchema,
    termsSchema,      // NUEVO
    privacySchema     // NUEVO
};