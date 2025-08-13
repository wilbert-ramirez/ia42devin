// Gestión de autenticación en el frontend

// Constantes
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+-_])[A-Za-z\d@$!%*?&#+-_]{12,}$/;
const RESEND_TIMEOUT = 30000; // 30 segundos
const REDIRECT_DELAY = 1000; // 1 segundo

// Caché de elementos DOM
const DOM = {
    loginForm: document.getElementById('loginForm'),
    emailInput: document.getElementById('email'),
    passwordInput: document.getElementById('password'),
    submitLoader: document.getElementById('submitLoader'),
    submitText: document.getElementById('submitText'),
    cancelBtn: document.getElementById('cancelBtn'),
    forgotLink: document.getElementById('forgotLink'),
    registerForm: document.getElementById('registerForm'),
    registerName: document.getElementById('registerName'),
    registerEmail: document.getElementById('registerEmail'),
    registerPassword: document.getElementById('registerPassword'),
    registerSpinner: document.getElementById('registerSpinner'),
    forgotPasswordForm: document.getElementById('forgotPasswordForm'),
    forgotEmail: document.getElementById('forgotEmail'),
    forgotSpinner: document.getElementById('forgotSpinner')
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    if (!DOM.loginForm) {
        console.warn('Formulario de login no encontrado');
        return;
    }

    setupEventListeners();
    handleUrlParameters();
    checkAuthStatus();
});

/**
 * Configura los event listeners para los formularios y campos
 */
function setupEventListeners() {
    if (DOM.loginForm) {
        DOM.loginForm.addEventListener('submit', handleLogin);
    }
    if (DOM.registerForm) {
        DOM.registerForm.addEventListener('submit', handleRegister);
    }
    if (DOM.forgotPasswordForm) {
        DOM.forgotPasswordForm.addEventListener('submit', handleForgotPassword);
    }
    if (DOM.emailInput) {
        DOM.emailInput.addEventListener('input', debounce(() => window.hideFieldError('email'), 300));
    }
    if (DOM.passwordInput) {
        DOM.passwordInput.addEventListener('input', debounce(() => window.hideFieldError('password'), 300));
    }
    if (DOM.cancelBtn) {
        DOM.cancelBtn.addEventListener('click', () => window.location.href = 'index.html');
    }
    if (DOM.forgotLink) {
        DOM.forgotLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.showModal?.('forgotPasswordModal');
        });
    }
}

/**
 * Maneja el envío del formulario de login
 * @param {Event} event - Evento de submit del formulario
 */
async function handleLogin(event) {
    event.preventDefault();
    if (!DOM.emailInput || !DOM.passwordInput) return;

    const email = DOM.emailInput.value.trim();
    const password = DOM.passwordInput.value;

    // Validar inputs
    if (!email) {
        window.showFieldError('email', 'El correo es obligatorio');
        DOM.emailInput.focus();
        DOM.emailInput.setAttribute('aria-invalid', 'true');
        return;
    }
    if (!window.isValidEmail(email)) {
        window.showFieldError('email', 'Correo no válido');
        DOM.emailInput.focus();
        DOM.emailInput.setAttribute('aria-invalid', 'true');
        return;
    }
    if (!password) {
        window.showFieldError('password', 'La contraseña es obligatoria');
        DOM.passwordInput.focus();
        DOM.passwordInput.setAttribute('aria-invalid', 'true');
        return;
    }

    // Mostrar spinner
    showSpinner(DOM.submitLoader, DOM.submitText);

    try {
        const response = await api?.login?.({ email, password });
        if (!response) throw new Error('API no disponible');

        if (response.success) {
            window.notify('¡Inicio de sesión exitoso!', 'success');
            window.closeModal?.('loginModal');
            DOM.emailInput.setAttribute('aria-invalid', 'false');
            DOM.passwordInput.setAttribute('aria-invalid', 'false');
            setTimeout(() => redirectLoginDashboard(response.data.user), REDIRECT_DELAY);
        } else {
            handleAuthError(response);
        }
    } catch (error) {
        handleAuthError(error);
    } finally {
        hideSpinner(DOM.submitLoader, DOM.submitText);
    }
}

/**
 * Maneja el envío del formulario de registro
 * @param {Event} event - Evento de submit del formulario
 */
async function handleRegister(event) {
    event.preventDefault();
    if (!DOM.registerName || !DOM.registerEmail || !DOM.registerPassword) return;

    const name = DOM.registerName.value.trim();
    const email = DOM.registerEmail.value.trim();
    const password = DOM.registerPassword.value;

    if (!validateRegisterForm(name, email, password)) return;

    showSpinner(DOM.registerSpinner);

    try {
        const response = await api?.register?.({ name, email, password });
        if (!response) throw new Error('API no disponible');

        if (response.success) {
            window.showNotification('¡Cuenta creada exitosamente! Revisa tu email para confirmar tu cuenta.', 'success');
            window.closeModal?.('registerModal');
            DOM.registerForm.reset();
            setTimeout(() => showResendConfirmationOption(email), 2000);
        } else {
            handleAuthError(response);
        }
    } catch (error) {
        handleAuthError(error);
    } finally {
        hideSpinner(DOM.registerSpinner);
    }
}

/**
 * Maneja el envío del formulario de recuperación de contraseña
 * @param {Event} event - Evento de submit del formulario
 */
async function handleForgotPassword(event) {
    event.preventDefault();
    if (!DOM.forgotEmail) return;

    const email = DOM.forgotEmail.value.trim();

    if (!window.isValidEmail(email)) {
        window.showFieldError('forgotEmail', 'Correo no válido');
        DOM.forgotEmail.focus();
        DOM.forgotEmail.setAttribute('aria-invalid', 'true');
        return;
    }

    showSpinner(DOM.forgotSpinner);

    try {
        const response = await api?.forgotPassword?.(email);
        if (!response) throw new Error('API no disponible');

        if (response.success) {
            window.showNotification('Si el email existe, se ha enviado un enlace de recuperación.', 'success');
            window.closeModal?.('forgotPasswordModal');
            DOM.forgotPasswordForm.reset();
            DOM.forgotEmail.setAttribute('aria-invalid', 'false');
        } else {
            handleAuthError(response);
        }
    } catch (error) {
        handleAuthError(error);
    } finally {
        hideSpinner(DOM.forgotSpinner);
    }
}

/**
 * Valida los campos del formulario de registro
 * @param {string} name - Nombre del usuario
 * @param {string} email - Correo electrónico
 * @param {string} password - Contraseña
 * @returns {boolean} - Verdadero si la validación pasa
 */
function validateRegisterForm(name, email, password) {
    if (name.length < 2) {
        window.showNotification('El nombre debe tener al menos 2 caracteres', 'error');
        DOM.registerName?.focus();
        DOM.registerName?.setAttribute('aria-invalid', 'true');
        return false;
    }
    if (!EMAIL_REGEX.test(email)) {
        window.showNotification('Por favor ingresa un email válido', 'error');
        DOM.registerEmail?.focus();
        DOM.registerEmail?.setAttribute('aria-invalid', 'true');
        return false;
    }
    if (!PASSWORD_REGEX.test(password)) {
        window.showNotification('La contraseña debe tener al menos 12 caracteres e incluir mayúsculas, minúsculas, números y símbolos', 'error');
        DOM.registerPassword?.focus();
        DOM.registerPassword?.setAttribute('aria-invalid', 'true');
        return false;
    }
    return true;
}

/**
 * Maneja errores de autenticación
 * @param {Error|Object} error - Objeto de error o respuesta de la API
 */
function handleAuthError(error) {
    let message = 'Ha ocurrido un error. Por favor intenta nuevamente.';
    if (error.error?.includes('no confirmada')) {
        message = 'Tu cuenta no ha sido confirmada. Revisa tu email o solicita un nuevo enlace de confirmación.';
        setTimeout(() => window.showModal?.('resendConfirmationModal'), 2000);
    } else if (error.error?.includes('bloqueada')) {
        message = 'Tu cuenta ha sido bloqueada temporalmente por múltiples intentos fallidos. Intenta nuevamente en 30 minutos.';
    } else if (error.error?.includes('Credenciales inválidas')) {
        message = 'Email o contraseña incorrectos.';
    } else if (error.error?.includes('existe una cuenta')) {
        message = 'Ya existe una cuenta con este correo electrónico.';
    } else {
        message = error.message || message;
    }
    
    window.notify(message, 'error');
}

/**
 * Verifica parámetros URL para confirmación o restablecimiento
 */
function handleUrlParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const confirmToken = urlParams.get('confirm');
    const resetToken = urlParams.get('reset');

    if (confirmToken) {
        handleEmailConfirmation(confirmToken);
    }
    if (resetToken) {
        handlePasswordReset(resetToken);
    }
}

/**
 * Maneja la confirmación de email
 * @param {string} token - Token de confirmación
 */
async function handleEmailConfirmation(token) {
    try {
        const response = await api?.confirmEmail?.(token);
        if (!response) throw new Error('API no disponible');

        if (response.success) {
            window.notify('¡Email confirmado exitosamente! Ya puedes iniciar sesión.', 'success');
            window.history.replaceState({}, document.title, window.location.pathname);
            setTimeout(() => window.showLoginModal?.(), 2000);
        } else {
            throw new Error(response.message || 'Error en confirmación');
        }
    } catch (error) {
        window.notify('Token de confirmación inválido o expirado.', 'error');
        window.history.replaceState({}, document.title, window.location.pathname);
    }
}


// Mostrar modal restablecer contraseña
function showPasswordResetModal() {
  const modal = document.getElementById('passwordResetModal');
  if (modal) {
    modal.style.display = 'flex';
    document.getElementById('newPassword').focus();
  }
}

// Ocultar modal
function hidePasswordResetModal() {
  const modal = document.getElementById('passwordResetModal');
  if (modal) {
    modal.style.display = 'none';
    clearPasswordResetForm();
  }
}

// Limpiar formulario y mensajes
function clearPasswordResetForm() {
  const form = document.getElementById('passwordResetForm');
  form.reset();
  const errorDiv = document.getElementById('passwordResetError');
  errorDiv.textContent = '';
}

// Validar contraseña con la regex definida
function validatePassword(password) {
  const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#+-_])[A-Za-z\d@$!%*?&#+-_]{12,}$/;
  return PASSWORD_REGEX.test(password);
}

// Manejar submit del formulario de restablecer contraseña
async function handlePasswordResetSubmit(event, token) {
  event.preventDefault();
  const newPassword = event.target.newPassword.value.trim();
  const confirmPassword = event.target.confirmPassword.value.trim();
  const errorDiv = document.getElementById('passwordResetError');
  
  errorDiv.textContent = '';
  
  if (!validatePassword(newPassword)) {
    errorDiv.textContent = 'La contraseña debe tener mínimo 12 caracteres, incluir mayúsculas, minúsculas, números y símbolos.';
    return;
  }
  if (newPassword !== confirmPassword) {
    errorDiv.textContent = 'Las contraseñas no coinciden.';
    return;
  }
  
  try {
    const response = await api?.resetPassword?.(token, newPassword);
    if (!response) throw new Error('API no disponible');
    
    if (response.success) {
      window.notify('Contraseña actualizada correctamente.', 'success');
      hidePasswordResetModal();
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      throw new Error(response.message || 'Error al actualizar contraseña');
    }
  } catch (error) {
    errorDiv.textContent = error.message || 'Error en el servidor.';
  }
}

// Vincular eventos al DOM
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('passwordResetForm');
  const cancelBtn = document.getElementById('cancelPasswordReset');
  if (form) {
    // Aquí asumimos que token viene desde URL o variable global
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('reset');
    
    form.addEventListener('submit', (e) => handlePasswordResetSubmit(e, resetToken));
  }
  if (cancelBtn) {
    cancelBtn.addEventListener('click', hidePasswordResetModal);
  }
});


/**
 * Maneja el restablecimiento de contraseña (stub)
 * @param {string} token - Token de restablecimiento
 */
async function handlePasswordReset(token) {
    if (!token) {
        window.showNotification('Token inválido.', 'error');
        return;
    }
    showPasswordResetModal();
}

/**
 * Verifica el estado de autenticación
 */
function checkAuthStatus() {
    const protectedPaths = ['/app/dashboard.html', '/app/lx-student.html', '/app/lx.html', '/app/payment.html'];
    const currentPath = window.location.pathname;

    if (api?.isAuthenticated?.() && !api?.isTokenExpired?.()) {
        const tokenData = api?.decodeToken?.();
        if (tokenData && !protectedPaths.includes(currentPath)) {
            redirectAfterLogin({ email: tokenData.email });
        }
    } else if (api?.getToken?.()) {
        api?.logout?.();
    }
}

/**
 * Redirige después del login
 * @param {Object} user - Datos del usuario
 */
function redirectAfterLogin(user) {
    //window.location.href = 'dashboard.html';
}


function redirectLoginDashboard(user) {
    window.location.href = 'dashboard.html';
}

/**
 * Muestra la opción de reenvío de confirmación
 * @param {string} email - Correo electrónico del usuario
 */
function showResendConfirmationOption(email) {
    const resendHtml = `
        <div class="resend-confirmation" style="text-align: center; margin: 20px 0;" role="alert">
            <p>¿No recibiste el email de confirmación?</p>
            <button class="btn btn-secondary" id="resendConfirmationBtn" aria-label="Reenviar email de confirmación">
                Reenviar Email de Confirmación
            </button>
        </div>
    `;

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = resendHtml.replace(/</g, '&lt;').replace(/>/g, '&gt;'); // Sanitizar HTML
    document.body.appendChild(tempDiv);

    const resendBtn = tempDiv.querySelector('#resendConfirmationBtn');
    if (resendBtn) {
        resendBtn.addEventListener('click', () => resendConfirmation(email));
    }

    setTimeout(() => {
        if (tempDiv.isConnected) {
            document.body.removeChild(tempDiv);
        }
    }, RESEND_TIMEOUT);
}

/**
 * Reenvía el email de confirmación
 * @param {string} email - Correo electrónico del usuario
 */
async function resendConfirmation(email) {
    try {
        const response = await api?.resendConfirmation?.(email);
        if (!response) throw new Error('API no disponible');
        if (response.success) {
            window.showNotification('Email de confirmación reenviado.', 'success');
        } else {
            throw new Error(response.message || 'Error al reenviar confirmación');
        }
    } catch (error) {
        window.showNotification('Error al reenviar confirmación.', 'error');
    }
}

/**
 * Muestra el spinner de carga
 * @param {HTMLElement} spinner - Elemento del spinner
 * @param {HTMLElement} [text] - Elemento de texto para ocultar
 */
function showSpinner(spinner, text) {
    if (spinner) {
        spinner.style.display = 'flex';
        spinner.setAttribute('aria-busy', 'true');
    }
    if (text) {
        text.style.display = 'none';
    }
}

/**
 * Oculta el spinner de carga
 * @param {HTMLElement} spinner - Elemento del spinner
 * @param {HTMLElement} [text] - Elemento de texto para mostrar
 */
function hideSpinner(spinner, text) {
    if (spinner) {
        spinner.style.display = 'none';
        spinner.setAttribute('aria-busy', 'false');
    }
    if (text) {
        text.style.display = 'inline';
    }
}

/**
 * Función de debounce para optimizar eventos
 * @param {Function} func - Función a debouncar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} - Función debouncada
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Cierra la sesión
 */
function logout() {
    api?.logout?.();
    window.showNotification('Sesión cerrada exitosamente.', 'success');
    window.location.href = 'login.html';
}