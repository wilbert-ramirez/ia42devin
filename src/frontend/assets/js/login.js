// 🎯 login.js - Lógica Específica para Página de Login
// Actualizado para usar el sistema unificado de password toggle

// ================================================
// 🔥 INICIALIZACIÓN DE LA PÁGINA DE LOGIN
// ================================================

// 🆕 VERIFICACIÓN ROBUSTA DE API ANTES DE USAR
function ensureApiAvailable() {
    // Verificar si api está disponible
    if (typeof api === 'undefined' || !api) {
        console.warn('⚠️ api no está disponible, intentando inicializar...');
        
        // Intentar usar la función global de inicialización
        if (typeof initializeApiClient === 'function') {
            api = initializeApiClient();
        } else if (typeof ApiClient !== 'undefined') {
            api = new ApiClient();
            window.api = api;
        } else {
            console.error('❌ CRÍTICO: No se puede inicializar ApiClient');
            throw new Error('ApiClient no está disponible. Verifica que api.js se haya cargado correctamente.');
        }
    }
    
    return api;
}

// 🆕 WRAPPER SEGURO PARA LLAMADAS A API
async function safeApiCall(apiMethod, ...args) {
    try {
        const apiInstance = ensureApiAvailable();
        
        if (typeof apiInstance[apiMethod] !== 'function') {
            throw new Error(`Método ${apiMethod} no existe en ApiClient`);
        }
        
        return await apiInstance[apiMethod](...args);
    } catch (error) {
        console.error(`❌ Error en ${apiMethod}:`, error);
        throw error;
    }
}

/**
 * Inicializar página de login
 */

function initLoginPage() {
    // ✅ NUEVO: Sistema unificado de password toggle (se auto-inicializa)
    // No necesitamos llamadas manuales, el sistema se inicializa automáticamente
    
    setupRealTimeValidation();
    setupLoginForm();
    setupForgotPassword();
    initializeDashboard();

    const emailInput = document.getElementById('email');
    if (emailInput) emailInput.focus();

    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => window.location.href = 'index.html');
    }

    console.log('✅ Página de login inicializada');
}

// ================================================
// 🚫 FUNCIONES REMOVIDAS (AHORA OBSOLETAS)
// ================================================

/*
❌ REMOVIDO: setupPasswordToggleDelegated() 
   - Contenía CSS inline (mala práctica)
   - Funcionalidad duplicada
   - Reemplazado por sistema unificado

❌ REMOVIDO: setupPasswordToggle()
   - Funcionalidad específica redundante
   - Menos flexible que el sistema unificado

✅ REEMPLAZADO POR: initPasswordToggleSystem() 
   - Se auto-inicializa en password-toggle-unified.js
   - Sin CSS inline
   - Soporte para múltiples toggles
   - Mejor accesibilidad
*/

// ================================================
// 🔥 VALIDACIÓN EN TIEMPO REAL
// ================================================

function setupRealTimeValidation() {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    
    // Limpiar errores al escribir
    if (emailInput) {
        emailInput.addEventListener('input', function() {
            // Asumimos que hideFieldError es una función global (de main.js o utils.js)
            if (typeof hideFieldError === 'function') {
                hideFieldError('email');
            }
        });
        
        // Validar email al perder el foco
        emailInput.addEventListener('blur', function() {
            const email = this.value.trim();
            // Asumimos que isValidEmail y showFieldError son globales
            if (email && typeof isValidEmail === 'function' && !isValidEmail(email)) {
                if (typeof showFieldError === 'function') {
                    showFieldError('email', 'Ingresa un correo electrónico válido');
                }
            }
        });
    }
    
    if (passwordInput) {
        passwordInput.addEventListener('input', function() {
            if (typeof hideFieldError === 'function') {
                hideFieldError('password');
            }
        });
    }
    
    console.log('✅ Validación en tiempo real configurada');
}

// ================================================
// 🔥 FORMULARIO DE LOGIN
// ================================================

function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    
    if (!loginForm) {
        console.error('Formulario de login no encontrado');
        return;
    }
    
    loginForm.addEventListener('submit', handleLoginSubmit);
    console.log('✅ Formulario de login configurado');
}

/**
 * Manejar envío del formulario de login
 */
async function handleLoginSubmit(event) {
    event.preventDefault();

    console.log('🚀 Iniciando proceso de login...');
    
    // 🆕 VERIFICAR QUE API ESTÉ DISPONIBLE
    try {
        ensureApiAvailable();
    } catch (error) {
        console.error('❌ Error crítico - API no disponible:', error);
        if (typeof showToast === 'function') {
            showToast('❌ Error de conexión. Recarga la página e intenta nuevamente.', 'error', 5000);
        } else {
            alert('Error de conexión. Recarga la página e intenta nuevamente.');
        }
        return;
    }
    
    // Validar formulario
    if (!validateLoginForm()) {
        if (typeof showToast === 'function') {
            showToast('Por favor corrige los errores antes de continuar', 'error', 3000);
        }
        return;
    }
    
    // Obtener datos del formulario
    const formData = new FormData(event.target);
    const credentials = {
        email: formData.get('email').trim(),
        password: formData.get('password'),
        rememberMe: formData.get('rememberMe') === 'on'
    };
    
    // Configurar botón de loading
    const submitButton = document.getElementById('loginBtn');
    const submitText = document.getElementById('submitText') || null;
    const submitLoader = document.getElementById('submitLoader') || null;

    setLoadingState(true, submitButton, submitText, submitLoader);
    
    try {
        if (typeof showToast === 'function') {
            showToast('🔄 Verificando credenciales...', 'info', 0);
        }
        
        // 🆕 USAR WRAPPER SEGURO PARA API
        const result = await safeApiCall('login', credentials);

        if (result.success) {
            await handleLoginSuccess(result.data, credentials.rememberMe);
        } else {
            if (typeof closeNotification === 'function') closeNotification();
            handleLoginError(result);
            return;
        }
        
    } catch (error) {
        if (typeof closeNotification === 'function') closeNotification();
        console.error('❌ Error de conexión o API:', error);
        
        if (error.data) {
            handleLoginError(error.data);
        } else {
            if (typeof showToast === 'function') {
                showToast(error.message || '❌ Error de conexión. Verifica tu internet e intenta nuevamente.', 'error', 5000);
            }
        }
    } finally {
        setLoadingState(false, submitButton, submitText, submitLoader);
    }
}

/**
 * Validar formulario de login
 */
function validateLoginForm() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    let hasErrors = false;
    
    // Asumimos que clearFormErrors es global
    if (typeof clearFormErrors === 'function') {
        clearFormErrors('loginForm');
    }
    
    // Validar email
    if (!email) {
        if (typeof showFieldError === 'function') {
            showFieldError('email', 'El correo electrónico es requerido');
        }
        hasErrors = true;
    } else if (typeof isValidEmail === 'function' && !isValidEmail(email)) {
        if (typeof showFieldError === 'function') {
            showFieldError('email', 'Ingresa un correo electrónico válido');
        }
        hasErrors = true;
    }
    
    // Validar contraseña
    if (!password) {
        if (typeof showFieldError === 'function') {
            showFieldError('password', 'La contraseña es requerida');
        }
        hasErrors = true;
    } else if (password.length < 6) { // Mantener validación básica de longitud
        if (typeof showFieldError === 'function') {
            showFieldError('password', 'La contraseña debe tener al menos 6 caracteres');
        }
        hasErrors = true;
    }
    
    return !hasErrors;
}

async function initializeDashboard() {
    // Verificar autenticación

    if (!api.isAuthenticated() || api.isTokenExpired()) {
        window.location.href = 'login.html';
        return;
    }

    try {
        window.location.href = 'dashboard.html';
        return;
        
    } catch (error) {
        console.error('Error inicializando dashboard:', error);
        showNotification('Error cargando el dashboard. Por favor recarga la página.', 'error');
    }
}

/**
 * Manejar login exitoso
 */
async function handleLoginSuccess(data, rememberMe) {
    console.log('✅ Login exitoso - Iniciando redirección:', data);

    try {
        // 1. El token ya fue guardado por api.login() -> api.setToken()
        
        // 2. Guardar datos del usuario según preferencia de recordar
        const storage = rememberMe ? localStorage : sessionStorage;
        if (data.user) {
            storage.setItem('user', JSON.stringify(data.user));
            console.log('💾 Datos de usuario guardados:', data.user.name);
        }
        
        // 3. Marcar que el usuario ha iniciado sesión antes
        localStorage.setItem('hasLoggedInBefore', 'true');
        
        // 4. Mostrar notificación de éxito
        if (typeof showToast === 'function') {
            showToast('✅ ¡Bienvenido de vuelta! Redirigiendo a tu dashboard...', 'success', 3000);
        }
        
        // 5. Actualizar estado de header si está disponible
        if (typeof updateHeaderAuthState === 'function') {
            setTimeout(() => {
                updateHeaderAuthState();
            }, 500);
        }
        
        // 6. REDIRECCIÓN GARANTIZADA AL DASHBOARD
        console.log('🔄 Redirigiendo al dashboard en 2 segundos...');
        
        setTimeout(() => {
            // Verificar una vez más que el token esté presente
            if (!api.isAuthenticated()) {
                console.error('❌ Token no disponible durante redirección');
                if (typeof showToast === 'function') {
                    showToast('Error de autenticación. Intenta nuevamente.', 'error', 3000);
                }
                return;
            }
            
            console.log('🚀 Navegando a dashboard.html...');
            window.location.href = 'dashboard.html';
        }, 2000);
        
    } catch (error) {
        console.error('❌ Error en handleLoginSuccess:', error);
        if (typeof showToast === 'function') {
            showToast('Error procesando login. Redirigiendo...', 'warning', 3000);
        }
        
        // Fallback: redirigir de todas formas
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 3000);
    }
}

/**
 * Manejar errores de login
 */
function handleLoginError(result) {
    console.error('❌ Error en lógica de login:', result); 

    const errorMessage = result.error || result.message || 'Error desconocido al iniciar sesión.';

    const isAccountNotConfirmed = (
        result.code === 'ACCOUNT_NOT_CONFIRMED' ||
        errorMessage.toLowerCase().includes('cuenta no confirmada') ||
        errorMessage.toLowerCase().includes('email not confirmed') ||
        (result.error && result.error.toLowerCase().includes('unconfirmed'))
    );

    if (errorMessage.includes('Credenciales inválidas') || errorMessage.includes('inválidas')) {
        if (typeof showFieldError === 'function') {
            showFieldError('password', 'Correo o contraseña incorrectos');
        }
        if (typeof showToast === 'function') {
            showToast('No pudimos iniciar sesión. Verifica que tu correo y contraseña sean correctos.', 'warning', 5000);
        }

    } else if (isAccountNotConfirmed) {
        const userEmail = document.getElementById('email')?.value.trim();
        if (typeof showToast === 'function') {
            showToast('Tu cuenta aún no ha sido confirmada. Revisa tu correo para activarla o solicita un nuevo enlace.', 'info', 8000);
        }
        setTimeout(() => {
            showResendConfirmationOption(userEmail);
        }, 2000);

    } else if (errorMessage.includes('bloqueada') || errorMessage.includes('blocked')) {
        if (typeof showToast === 'function') {
            showToast('Por seguridad, tu cuenta está temporalmente bloqueada por múltiples intentos fallidos. Inténtalo de nuevo en unos minutos.', 'error', 10000);
        }

    } else {
        if (typeof showToast === 'function') {
            showToast('Ocurrió un problema al intentar iniciar sesión. Por favor, inténtalo nuevamente o contáctanos si el error persiste.', 'error', 6000);
        }
    }
}

/**
 * Configurar estado de loading en botón
 */
function setLoadingState(loading, button, textElement, loaderElement) {
    if (!button || !textElement || !loaderElement) {
        console.warn('Elementos del botón de submit no encontrados para setLoadingState');
        return;
    }
    
    if (loading) {
        button.disabled = true;
        button.classList.add('loading');
        textElement.style.display = 'none';
        loaderElement.style.display = 'flex'; // 'flex' para centrar el spinner si está dentro de un div
    } else {
        button.disabled = false;
        button.classList.remove('loading');
        textElement.style.display = 'inline'; // O 'flex' si el span tiene icono + texto
        loaderElement.style.display = 'none';
    }
}

// ================================================
// 🔥 RECUPERACIÓN DE CONTRASEÑA
// ================================================

function setupForgotPassword() {
    const forgotLink = document.getElementById('forgotLink');
    
    if (forgotLink) {
        forgotLink.addEventListener('click', function(e) {
            e.preventDefault();
            handleForgotPasswordClick();
        });
    }
}

async function handleForgotPasswordClick() {
    const emailInput = document.getElementById('email');
    const email = emailInput.value.trim();
    
    if (!email) {
        if (typeof showToast === 'function') {
            showToast('ℹ️ Ingresa tu email primero para recuperar tu contraseña', 'info', 4000);
        }
        emailInput.focus();
        return;
    }
    
    if (typeof isValidEmail === 'function' && !isValidEmail(email)) {
        if (typeof showToast === 'function') {
            showToast('⚠️ Ingresa un email válido para continuar', 'warning', 4000);
        }
        emailInput.focus();
        return;
    }
    
    if (typeof showToast === 'function') {
        showToast('🔄 Solicitando recuperación de contraseña...', 'info', 0);
    }

    try {
        // 🆕 USAR WRAPPER SEGURO
        const result = await safeApiCall('forgotPassword', email);
        
        if (result.success) {
            if (typeof showToast === 'function') {
                showToast('📧 Si el email existe en nuestra base de datos, se ha enviado un enlace de recuperación.', 'success', 6000);
            }
        } else {
            if (typeof showToast === 'function') {
                showToast(result.error || result.message || 'Error al solicitar recuperación.', 'error', 5000);
            }
        }
    } catch (error) {
        console.error('❌ Error en forgotPassword:', error);
        if (typeof showToast === 'function') {
            showToast(error.data?.message || error.message || '❌ Error al solicitar recuperación.', 'error', 5000);
        }
    }
}

// ================================================
// 🔥 CONFIRMACIÓN DE EMAIL AUTOMÁTICA DESDE URL
// ================================================

/**
 * Manejar confirmación de email automática desde URL
 */
async function handleUrlEmailConfirmation() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('confirm_token');

    if (!token) return;

    console.log('🔗 Procesando confirmación de email desde URL:', token);
    
    if (typeof showToast === 'function') {
        showToast('🔄 Confirmando tu email...', 'info', 0);
    }
    
    try {
        // 🆕 USAR WRAPPER SEGURO
        const result = await safeApiCall('confirmEmail', token);
        
        if (result.success) {
            window.history.replaceState({}, document.title, window.location.pathname);
            if (typeof showToast === 'function') {
                showToast('✅ ¡Email confirmado exitosamente! Ya puedes iniciar sesión.', 'success', 8000);
            }
            
            if (result.data && result.data.email) { 
                const emailInput = document.getElementById('email');
                if (emailInput) {
                    emailInput.value = result.data.email;
                    emailInput.focus();
                }
            }
        } else {
            throw new Error(result.error || result.message || 'Token inválido o expirado');
        }
        
    } catch (error) {
        console.error('❌ Error confirmando email desde URL:', error);
        window.history.replaceState({}, document.title, window.location.pathname);
        if (typeof showToast === 'function') {
            showToast(error.data?.message || error.message || '❌ Token de confirmación inválido o expirado. Solicita un nuevo enlace.', 'error', 8000);
        }
    }
}

/**
 * Mostrar opción para reenviar confirmación (llamada si el login falla por email no confirmado)
 */
async function showResendConfirmationOption(email) { // Make it async
    if (typeof showToast !== 'function' || typeof isValidEmail !== 'function' || typeof api !== 'object' || typeof api.resendConfirmation !== 'function') return;

    if (!email || !isValidEmail(email)) { // Validar el email que se pasó
        showToast('📧 Email no válido para reenviar confirmación. Intenta iniciar sesión de nuevo.', 'warning', 7000);
        return;
    }
    
    // Usar confirm() para una interacción simple. Para una UI más rica, usar un modal.
    const userWantsToResend = confirm(`Tu cuenta con el email ${email} no está confirmada. ¿Deseas reenviar el correo de confirmación?`);
    
    if (userWantsToResend) {
        if (typeof showToast === 'function') {
            showToast('🔄 Reenviando correo de confirmación...', 'info', 0);
        }
        try {
            const result = await api.resendConfirmation(email); // Usar ApiClient
            if (result.success) {
                if (typeof showToast === 'function') {
                    showToast(`📧 Correo de confirmación reenviado a ${email}. Revisa tu bandeja de entrada y spam.`, 'success', 7000);
                }
            } else {
                // Error lógico del backend al reenviar
                if (typeof showToast === 'function') { 
                    showToast(result.error || result.message || '❌ No se pudo reenviar el correo. Intenta más tarde.', 'error', 7000);
                }
            }
        } catch (error) { // Error de red o error lanzado por ApiClient (ej. 400, 404, 500) que ya tiene error.data
             if (typeof showToast === 'function') {
                showToast(error.data?.message || error.message || '❌ Error al intentar reenviar el correo.', 'error', 7000);
             }
        }
    } else {
        if (typeof showToast === 'function') {
            showToast('📧 Reenvío cancelado. Puedes intentar iniciar sesión más tarde o contactar a soporte si continúas con problemas.', 'info', 10000);
        }
    }
}

// ================================================
// 🔥 UTILIDADES Y HELPERS (Específicas de Login si no son globales)
// ================================================

/**
 * Limpiar formulario
 */
function clearLoginForm() {
    const form = document.getElementById('loginForm');
    if (form) {
        form.reset();
        if (typeof clearFormErrors === 'function') { // Asumiendo clearFormErrors es global
            clearFormErrors('loginForm');
        }
    }
}

/**
 * Pre-llenar email (útil para testing)
 */
function prefillEmail(email) {
    const emailInput = document.getElementById('email');
    if (emailInput && email) {
        emailInput.value = email;
    }
}

// ================================================
// 🔥 INICIALIZACIÓN AL CARGAR EL DOM
// ================================================
document.addEventListener('DOMContentLoaded', function() {
    initLoginPage();
    handleUrlEmailConfirmation(); // Verificar si hay un token de confirmación en la URL al cargar
});

// ================================================
// 🔥 EXPORTAR FUNCIONES GLOBALES (SI ES NECESARIO)
// ================================================

// Generalmente, es mejor evitar exponer demasiadas funciones globalmente.
// initLoginPage se llama con DOMContentLoaded.
// Otras funciones son internas o llamadas por eventos.

// Para debugging en consola (opcional)
window.loginPageDebug = {
    validateForm: validateLoginForm,
    clearForm: clearLoginForm,
    prefillEmail: prefillEmail,
    handleForgotPasswordClick: handleForgotPasswordClick
};

console.log('✅ Login.js actualizado y cargado - Usando sistema unificado de password toggle');

// ================================================
// 🔥 TESTING/DESARROLLO
// ================================================

// Solo en desarrollo - auto-completar para testing
if (window.location.hostname === 'localhost') {
    // Datos de prueba comentados - descomenta para testing
    // setTimeout(() => {
    //     prefillEmail('test@example.com');
    //     document.getElementById('password').value = 'Password123!';
    // }, 500);
}
