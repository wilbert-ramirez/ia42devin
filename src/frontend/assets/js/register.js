/**
 * IA42 Register Page JavaScript
 * Actualizado para usar el sistema unificado de password toggle
 * Handles registration form functionality, validation, and API integration
 * Compatible with IA42 backend system
 */

// Configuration - Integrado con tu sistema IA42
console.log('🚀 IA42 Register Page loaded - Versión actualizada');
console.log('📡 API Base:', typeof API_BASE !== 'undefined' ? API_BASE : 'No definido');

// ==============================================
// 🚫 FUNCIONES REMOVIDAS (AHORA OBSOLETAS)
// ==============================================

/*
❌ REMOVIDO: setupPasswordTogglesDelegated()
   - Funcionalidad duplicada
   - Reemplazado por sistema unificado en password-toggle-unified.js

✅ REEMPLAZADO POR: initPasswordToggleSystem() 
   - Se auto-inicializa automáticamente
   - Mejor rendimiento con event delegation
   - Soporte para múltiples toggles
   - Mejor accesibilidad (ARIA labels)
   - Sin código duplicado
*/

// ==============================================
// PASSWORD STRENGTH VALIDATION
// ==============================================

function checkPasswordRequirements(password) {
    return {
        length: password.length >= 12,
        lowercase: /[a-z]/.test(password),
        uppercase: /[A-Z]/.test(password),
        number: /\d/.test(password),
        symbol: /[@$!%*?&#+-_]/.test(password)
    };
}

function updatePasswordStrength() {
    const password = document.getElementById('password').value;
    const requirements = checkPasswordRequirements(password);
    const metCount = Object.values(requirements).filter(Boolean).length;
    
    // Update requirement indicators
    Object.keys(requirements).forEach(req => {
        const element = document.querySelector(`[data-req="${req}"]`);
        if (element) {
            if (requirements[req]) {
                element.classList.add('met');
                element.querySelector('i').className = 'fas fa-check-circle';
            } else {
                element.classList.remove('met');
                element.querySelector('i').className = 'fas fa-circle';
            }
        }
    });
    
    // Update strength bar
    const strengthBar = document.getElementById('strengthBar');
    const strengthText = document.getElementById('strengthText');
    
    if (!strengthBar || !strengthText) return;
    
    let percentage = (metCount / 5) * 100;
    let color = '#ef4444';
    let text = 'Muy débil';
    
    if (metCount >= 5) {
        color = '#22c55e';
        text = 'Excelente';
    } else if (metCount >= 4) {
        color = '#3b82f6';
        text = 'Fuerte';
    } else if (metCount >= 3) {
        color = '#f59e0b';
        text = 'Regular';
    } else if (metCount >= 2) {
        color = '#ef4444';
        text = 'Débil';
    }
    
    strengthBar.style.width = percentage + '%';
    strengthBar.style.background = color;
    strengthText.textContent = `Seguridad: ${text}`;
}

// ==============================================
// FORM VALIDATION
// ==============================================

function validateField(fieldId, value) {
    const errorElement = document.getElementById(fieldId + 'Error');
    let isValid = true;
    let message = '';

    switch(fieldId) {
        case 'name':
            if (!value.trim()) {
                isValid = false;
                message = 'El nombre es requerido';
            } else if (value.trim().length < 2) {
                isValid = false;
                message = 'El nombre debe tener al menos 2 caracteres';
            } else if (value.trim().length > 100) {
                isValid = false;
                message = 'El nombre debe tener máximo 100 caracteres';
            }
            break;
        
        case 'email':
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!value.trim()) {
                isValid = false;
                message = 'El correo electrónico es requerido';
            } else if (!emailRegex.test(value)) {
                isValid = false;
                message = 'Ingresa un correo electrónico válido';
            }
            break;
        
        case 'password':
            const requirements = checkPasswordRequirements(value);
            const metCount = Object.values(requirements).filter(Boolean).length;
            if (metCount < 5) {
                isValid = false;
                message = 'La contraseña no cumple con todos los requisitos';
            }
            break;
        
        case 'confirmPassword':
            const password = document.getElementById('password').value;
            if (!value) {
                isValid = false;
                message = 'Confirma tu contraseña';
            } else if (value !== password) {
                isValid = false;
                message = 'Las contraseñas no coinciden';
            }
            break;
    }

    if (errorElement) {
        if (isValid) {
            errorElement.style.display = 'none';
        } else {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    return isValid;
}

function setupRealTimeValidation() {
    // Real-time validation - SIN birthdate
    ['name', 'email', 'password', 'confirmPassword'].forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('blur', function() {
                validateField(fieldId, this.value);
            });
            
            field.addEventListener('input', function() {
                const errorElement = document.getElementById(fieldId + 'Error');
                if (errorElement && errorElement.style.display === 'block') {
                    validateField(fieldId, this.value);
                }
            });
        }
    });
}

// ==============================================
// TOAST NOTIFICATION SYSTEM
// ==============================================

// ==============================================
// TOAST NOTIFICATION SYSTEM
// ==============================================

function showToast(type, title, message) {
    console.log(`📢 Showing toast: ${type}, ${title}, ${message}`);

    let container = document.getElementById('toastContainer');
    if (!container) {
        console.log('📢 Creating dynamic toast container');
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'register-toast-container';
        container.style.cssText = `
            position: fixed;
            top: 1rem;
            right: 1rem;
            z-index: 9999;
            max-width: 400px;
        `;
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    const colors = {
        success: '#22c55e',
        error: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6'
    };
    
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    toast.style.cssText = `
        background: rgba(0,0,0,0.9);
        border: 1px solid ${colors[type]};
        border-left: 4px solid ${colors[type]};
        border-radius: 0.5rem;
        padding: 1rem;
        margin-bottom: 0.5rem;
        min-width: 300px;
        max-width: 400px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease-out;
    `;
    
    toast.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 0.75rem;">
            <i class="${icons[type]}" style="color: ${colors[type]}; margin-top: 0.125rem;"></i>
            <div style="flex: 1;">
                <div style="font-weight: 600; color: #fff;">${title}</div>
                <div style="font-size: 0.875rem; color: #ccc;">${message}</div>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" 
                    style="background: none; border: none; color: #666; cursor: pointer; padding: 0.25rem;">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => toast.remove(), 300);
        }
    }, 5000);
}

// ==============================================
// FORM SUBMISSION
// ==============================================

async function handleFormSubmission(e) {
    e.preventDefault();
    
    console.log('🚀 Iniciando proceso de registro IA42...');
    
    // Validate all fields - SIN birthdate
    const fields = ['name', 'email', 'password', 'confirmPassword'];
    let isFormValid = true;
    
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field && !validateField(fieldId, field.value)) {
            isFormValid = false;
        }
    });
    
    // Check checkboxes
    const readusageterms = document.getElementById('readusageterms');
    const readprivatepolicy = document.getElementById('readprivatepolicy');
    
    if (!readusageterms.checked) {
        document.getElementById('readusagetermsError').textContent = 'Debes aceptar los términos de uso';
        document.getElementById('readusagetermsError').style.display = 'block';
        isFormValid = false;
    } else {
        document.getElementById('readusagetermsError').style.display = 'none';
    }
    
    if (!readprivatepolicy.checked) {
        document.getElementById('readprivatepolicyError').textContent = 'Debes aceptar la política de privacidad';
        document.getElementById('readprivatepolicyError').style.display = 'block';
        isFormValid = false;
    } else {
        document.getElementById('readprivatepolicyError').style.display = 'none';
    }
    
    if (!isFormValid) {
        showToast('error', 'Errores en el formulario', 'Por favor corrige los errores antes de continuar');
        return;
    }
    
    // Show loading state
    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitText');
    const submitLoader = document.getElementById('submitLoader');
    
    if (submitBtn) submitBtn.disabled = true;
    if (submitText) submitText.style.display = 'none';
    if (submitLoader) submitLoader.style.display = 'inline';
    
    try {
        // ✅ MEJORADO: Usar ApiClient si está disponible, fallback a fetch
        let response, data;
        
        const formData = {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
            readusageterms: readusageterms.checked,
            readprivatepolicy: readprivatepolicy.checked
        };
        
        console.log('📤 Enviando datos a API:', { ...formData, password: '[PROTECTED]' });
        
        // Usar ApiClient si está disponible (más consistente con el resto de la app)
        if (typeof api !== 'undefined' && api.register) {
            console.log('📡 Usando ApiClient para registro');
            const result = await api.register(formData);
            
            if (result.success) {
                // Registration successful
                showToast('success', '¡Cuenta creada!', 'Revisa tu correo para confirmar tu cuenta');
                
                // Show step 2
                const step1 = document.getElementById('step1');
                const step2 = document.getElementById('step2');
                if (step1) step1.style.display = 'none';
                if (step2) step2.style.display = 'block';
                
                // Update progress indicator
                const step2Progress = document.querySelector('[data-step="2"]');
                if (step2Progress) step2Progress.classList.add('active');
                
                // Show email
                const emailDisplay = document.getElementById('sentToEmail');
                if (emailDisplay) emailDisplay.textContent = formData.email;
                
            } else {
                // Registration failed
                handleRegistrationError(result);
            }
            
        } else {
            // Fallback a fetch directo si ApiClient no está disponible
            console.log('📡 Usando fetch directo para registro (ApiClient no disponible)');
            const apiBase = typeof API_BASE !== 'undefined' ? API_BASE : '/api/v1';
            
            response = await fetch(`${apiBase}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });
            
            console.log('📡 Respuesta del servidor:', response.status);
            data = await response.json();
            console.log('📋 Datos de respuesta:', data);
            
            if (response.ok) {
                // Registration successful
                showToast('success', '¡Cuenta creada!', 'Revisa tu correo para confirmar tu cuenta');
                
                // Show step 2
                const step1 = document.getElementById('step1');
                const step2 = document.getElementById('step2');
                if (step1) step1.style.display = 'none';
                if (step2) step2.style.display = 'block';
                
                // Update progress indicator
                const step2Progress = document.querySelector('[data-step="2"]');
                if (step2Progress) step2Progress.classList.add('active');
                
                // Show email
                const emailDisplay = document.getElementById('sentToEmail');
                if (emailDisplay) emailDisplay.textContent = formData.email;
                
            } else {
                // Registration failed
                handleRegistrationError(data);
            }
        }
        
    } catch (error) {
        console.error('❌ Error de conexión:', error);
        showToast('error', 'Error de conexión', 'No se pudo conectar con el servidor. Verifica tu conexión.');
    } finally {
        // Reset button state
        if (submitBtn) submitBtn.disabled = false;
        if (submitText) submitText.style.display = 'inline';
        if (submitLoader) submitLoader.style.display = 'none';
    }
}

/**
 * ✅ NUEVA: Función para manejar errores de registro de forma consistente
 */
function handleRegistrationError(errorData) {
    let errorMessage = 'Ocurrió un error inesperado';
    
    if (errorData.message) {
        errorMessage = errorData.message;
    } else if (errorData.error) {
        errorMessage = errorData.error;
    } else if (errorData.errors && Array.isArray(errorData.errors)) {
        errorMessage = errorData.errors[0].message || errorData.errors[0];
    }
    
    showToast('error', 'Error al registrarse', errorMessage);
}

// ==============================================
// STEP 2 FUNCTIONS
// ==============================================

async function checkEmailVerification() {
    const emailElement = document.getElementById('sentToEmail');
    if (!emailElement) return;
    
    const email = emailElement.textContent;
    
    showToast('info', 'Verificando...', 'Consultando estado de verificación');
    
    try {
        // ✅ MEJORADO: Usar ApiClient si está disponible
        let result;
        
        
            
            // Fallback a fetch directo
            const apiBase = typeof API_BASE !== 'undefined' ? API_BASE : '/api/v1';
            const response = await fetch(`${apiBase}/auth/check-verification-status`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
            
            result = await response.json();
       
        
        if (result.success && result.verified) {
            showToast('success', '¡Email verificado!');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showToast('info', 'Verificación pendiente', 'Tu email aún no ha sido verificado');
        }
        
    } catch (error) {
        console.error('❌ Error checking verification:', error);
        showToast('error', 'Error', 'No se pudo verificar el estado del email');
    }
}

async function resendVerificationEmail() {
    const emailElement = document.getElementById('sentToEmail');
    if (!emailElement) return;
    
    const email = emailElement.textContent;
    
    showToast('info', 'Reenviando...', 'Enviando nuevo correo de verificación');
    
    try {
        // ✅ MEJORADO: Usar ApiClient si está disponible
        let result;
        
        if (typeof api !== 'undefined' && api.resendConfirmation) {
            result = await api.resendConfirmation(email);
        } else {
            // Fallback a fetch directo
            const apiBase = typeof API_BASE !== 'undefined' ? API_BASE : '/api/v1';
            const response = await fetch(`${apiBase}/auth/resend-confirmation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });
            
            result = await response.json();
        }
        
        if (result.success) {
            showToast('success', 'Correo reenviado', 'Revisa tu bandeja de entrada');
        } else {
            showToast('error', 'Error', result.message || 'No se pudo reenviar el correo');
        }
        
    } catch (error) {
        console.error('❌ Error resending email:', error);
        showToast('error', 'Error', 'No se pudo reenviar el correo de confirmación');
    }
}

// ==============================================
// API CONNECTION TEST
// ==============================================

async function testApiConnection() {
    console.log('🔄 Verificando conexión con API IA42...');
    
    try {
        const apiBase = typeof API_BASE !== 'undefined' ? API_BASE : '/api/v1';
        const response = await fetch(`${apiBase}/courses/test`);
        if (response.ok) {
            console.log('✅ API IA42 conectada correctamente');
            //showToast('success', 'Sistema IA42', 'Conexión establecida correctamente');
        } else {
            console.warn('⚠️ API responde pero con errores');
            showToast('warning', 'Conexión', 'Conexión establecida con advertencias');
        }
    } catch (error) {
        console.error('❌ Error de conexión API:', error);
        showToast('warning', 'Conexión', 'Verificando conectividad del servidor...');
    }
}

// ==============================================
// KEYBOARD SHORTCUTS
// ==============================================

function setupKeyboardNavigation() {
    document.addEventListener('keydown', function(e) {
        // Enter en campos de texto avanza al siguiente
        if (e.key === 'Enter' && e.target.tagName === 'INPUT' && e.target.type !== 'submit') {
            e.preventDefault();
            const inputs = Array.from(document.querySelectorAll('input'));
            const currentIndex = inputs.indexOf(e.target);
            const nextInput = inputs[currentIndex + 1];
            if (nextInput) {
                nextInput.focus();
            }
        }
    });
}

// ==============================================
// PASSWORD STRENGTH SETUP
// ==============================================

function setupPasswordStrength() {
    const passwordInput = document.getElementById('password');
    if (!passwordInput) return;
    
    passwordInput.addEventListener('input', function() {
        const strengthDiv = document.getElementById('passwordStrength');
        if (this.value.length > 0) {
            if (strengthDiv) strengthDiv.style.display = 'block';
            updatePasswordStrength();
        } else {
            if (strengthDiv) strengthDiv.style.display = 'none';
        }
    });
}

// ==============================================
// INITIALIZATION
// ==============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🔧 Inicializando IA42 Register System...');
    
    // ✅ NUEVO: El sistema de password toggle se auto-inicializa
    // No necesitamos llamadas manuales
    
    // Setup password strength indicator
    setupPasswordStrength();
    
    // Setup real-time validation
    setupRealTimeValidation();
    
    // Setup keyboard navigation
    setupKeyboardNavigation();
    
    // Setup form submission
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleFormSubmission);
    }

    const checkButton = document.getElementById('checkVerificationBtn');
    if (checkButton) {
        checkButton.addEventListener('click', checkEmailVerification);
    }

    const resendButton = document.getElementById('resendVerificationBtn');
    if (resendButton) {
        resendButton.addEventListener('click', resendVerificationEmail);
    }


    
    // Test API connection
    testApiConnection();
    
    console.log('✅ IA42 Register System initialized successfully - Usando sistema unificado');
});

// ==============================================
// GLOBAL FUNCTIONS (for onclick handlers)
// ==============================================

// Make functions available globally for onclick handlers in HTML
window.checkEmailVerification = checkEmailVerification;
window.resendVerificationEmail = resendVerificationEmail;
