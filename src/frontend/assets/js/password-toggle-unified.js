/**
 * ================================================
 * 🔑 PASSWORD TOGGLE - FUNCIONALIDAD UNIFICADA
 * ================================================
 * 
 * Sistema unificado para mostrar/ocultar contraseñas
 * Compatible con login.html y register.html
 * 
 * Características:
 * ✅ Event delegation para rendimiento
 * ✅ Soporte para múltiples toggles en una página
 * ✅ Accesibilidad completa (ARIA labels)
 * ✅ Animaciones suaves
 * ✅ Sin CSS inline
 * ✅ Logging para debugging
 */

// ================================================
// 🎯 CLASE PRINCIPAL - PasswordToggleManager
// ================================================

class PasswordToggleManager {
    constructor() {
        this.isInitialized = false;
        this.toggles = new Map(); // Para tracking de estado
        this.init();
    }

    /**
     * 🚀 Inicializar el sistema de toggles
     */
    init() {
        if (this.isInitialized) {
            console.warn('⚠️ PasswordToggleManager ya está inicializado');
            return;
        }

        this.setupEventDelegation();
        this.setupKeyboardSupport();
        this.isInitialized = true;
        
        console.log('✅ PasswordToggleManager inicializado correctamente');
    }

    /**
     * 🎪 Event Delegation - Un solo listener para todos los toggles
     */
    setupEventDelegation() {
        document.addEventListener('click', (event) => {
            const toggleBtn = event.target.closest('.password-toggle');
            if (!toggleBtn) return;

            event.preventDefault();
            this.handleToggleClick(toggleBtn);
        });

        // Prevenir submit accidental al hacer click en toggle
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && event.target.classList.contains('password-toggle')) {
                event.preventDefault();
                this.handleToggleClick(event.target);
            }
        });
    }

    /**
     * ⌨️ Soporte completo de teclado para accesibilidad
     */
    setupKeyboardSupport() {
        document.addEventListener('keydown', (event) => {
            const toggleBtn = event.target.closest('.password-toggle');
            if (!toggleBtn) return;

            // Espacio o Enter activan el toggle
            if (event.key === ' ' || event.key === 'Enter') {
                event.preventDefault();
                this.handleToggleClick(toggleBtn);
            }

            // Escape devuelve foco al input
            if (event.key === 'Escape') {
                const input = this.findRelatedInput(toggleBtn);
                if (input) {
                    input.focus();
                }
            }
        });
    }

    /**
     * 🎬 Manejar click en toggle con animaciones
     */
    async handleToggleClick(toggleBtn) {
        try {
            // Prevenir múltiples clicks rápidos
            if (toggleBtn.classList.contains('loading')) {
                return;
            }

            // Buscar input relacionado
            const input = this.findRelatedInput(toggleBtn);
            if (!input) {
                console.error('❌ No se encontró input relacionado para toggle:', toggleBtn);
                return;
            }

            // Aplicar estado de loading temporal
            this.setLoadingState(toggleBtn, true);

            // Ejecutar toggle con animación
            await this.togglePasswordVisibility(toggleBtn, input);

            // Logging para debugging
            const inputId = input.id || input.name || 'unknown';
            console.log(`🔄 Toggle password para input: ${inputId}`);

        } catch (error) {
            console.error('❌ Error en handleToggleClick:', error);
        } finally {
            // Remover estado de loading
            this.setLoadingState(toggleBtn, false);
        }
    }

    /**
     * 🔍 Encontrar input relacionado al toggle (flexible)
     */
    findRelatedInput(toggleBtn) {
        // Método 1: Buscar en contenedor padre
        const wrapper = toggleBtn.closest('.input-wrapper, .register-input-container, .form-group');
        if (wrapper) {
            const input = wrapper.querySelector('input[type="password"], input[type="text"]');
            if (input) return input;
        }

        // Método 2: Buscar por ID del toggle (convención)
        const toggleId = toggleBtn.id;
        if (toggleId) {
            // Convenciones: togglePassword -> password, toggleConfirmPassword -> confirmPassword
            const inputId = toggleId.replace('toggle', '').toLowerCase();
            const input = document.getElementById(inputId);
            if (input) return input;
        }

        // Método 3: Buscar el input anterior en el DOM
        let sibling = toggleBtn.previousElementSibling;
        while (sibling) {
            if (sibling.tagName === 'INPUT' && 
                (sibling.type === 'password' || sibling.type === 'text')) {
                return sibling;
            }
            // También buscar dentro de elementos
            const input = sibling.querySelector?.('input[type="password"], input[type="text"]');
            if (input) return input;
            
            sibling = sibling.previousElementSibling;
        }

        return null;
    }

    /**
     * 👁️ Alternar visibilidad de contraseña con animación
     */
    async togglePasswordVisibility(toggleBtn, input) {
        const icon = toggleBtn.querySelector('i');
        if (!icon) {
            console.error('❌ No se encontró icono en toggle:', toggleBtn);
            return;
        }

        // Estado actual
        const isCurrentlyHidden = input.type === 'password';
        const newType = isCurrentlyHidden ? 'text' : 'password';
        
        // Animación de cambio de icono
        toggleBtn.classList.add('changing');
        
        // Pequeño delay para animación suave
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Cambiar tipo de input
        input.type = newType;
        
        // Actualizar icono
        this.updateToggleIcon(icon, isCurrentlyHidden);
        
        // Actualizar ARIA label para accesibilidad
        const newLabel = isCurrentlyHidden ? 'Ocultar contraseña' : 'Mostrar contraseña';
        toggleBtn.setAttribute('aria-label', newLabel);
        toggleBtn.title = newLabel; // Tooltip adicional
        
        // Remover clase de animación
        setTimeout(() => {
            toggleBtn.classList.remove('changing');
        }, 200);
        
        // Mantener foco en input para UX fluida
        input.focus();
        
        // Guardar estado para tracking
        this.updateToggleState(toggleBtn, !isCurrentlyHidden);
    }

    /**
     * 🎨 Actualizar icono del toggle
     */
    updateToggleIcon(icon, wasHidden) {
        // Remover clases anteriores
        icon.classList.remove('fa-eye', 'fa-eye-slash');
        
        // Agregar clase correcta
        const newIconClass = wasHidden ? 'fa-eye-slash' : 'fa-eye';
        icon.classList.add(newIconClass);
    }

    /**
     * ⏳ Manejar estado de loading del toggle
     */
    setLoadingState(toggleBtn, isLoading) {
        if (isLoading) {
            toggleBtn.classList.add('loading');
            toggleBtn.disabled = true;
        } else {
            toggleBtn.classList.remove('loading');
            toggleBtn.disabled = false;
        }
    }

    /**
     * 📊 Actualizar estado interno para tracking
     */
    updateToggleState(toggleBtn, isVisible) {
        const toggleId = toggleBtn.id || `toggle_${Date.now()}`;
        this.toggles.set(toggleId, {
            isVisible,
            lastToggled: new Date(),
            element: toggleBtn
        });
    }

    /**
     * 🔧 Métodos de utilidad pública
     */

    /**
     * Mostrar contraseña específica
     */
    showPassword(inputId) {
        const input = document.getElementById(inputId);
        if (input && input.type === 'password') {
            const toggle = this.findToggleForInput(input);
            if (toggle) {
                this.handleToggleClick(toggle);
            }
        }
    }

    /**
     * Ocultar contraseña específica
     */
    hidePassword(inputId) {
        const input = document.getElementById(inputId);
        if (input && input.type === 'text') {
            const toggle = this.findToggleForInput(input);
            if (toggle) {
                this.handleToggleClick(toggle);
            }
        }
    }

    /**
     * Encontrar toggle para un input específico
     */
    findToggleForInput(input) {
        const wrapper = input.closest('.input-wrapper, .register-input-container, .form-group');
        return wrapper?.querySelector('.password-toggle');
    }

    /**
     * Obtener estadísticas de uso (para analytics)
     */
    getUsageStats() {
        return {
            totalToggles: this.toggles.size,
            toggleStates: Array.from(this.toggles.entries()).map(([id, state]) => ({
                id,
                isVisible: state.isVisible,
                lastToggled: state.lastToggled
            }))
        };
    }

    /**
     * 🔄 Reinicializar sistema (útil para SPA)
     */
    reinitialize() {
        this.isInitialized = false;
        this.toggles.clear();
        this.init();
        console.log('🔄 PasswordToggleManager reinicializado');
    }
}

// ================================================
// 🌍 INSTANCIA GLOBAL
// ================================================

let passwordToggleManager = null;

/**
 * 🚀 Inicializar sistema de password toggles
 * Función principal para llamar desde otros archivos
 */
function initPasswordToggleSystem() {
    if (!passwordToggleManager) {
        passwordToggleManager = new PasswordToggleManager();
    }
    return passwordToggleManager;
}

/**
 * 🎯 Función legacy para compatibilidad con código existente
 * @deprecated Usar initPasswordToggleSystem() en su lugar
 */
function setupPasswordToggle() {
    console.warn('⚠️ setupPasswordToggle() está deprecated. Usa initPasswordToggleSystem()');
    return initPasswordToggleSystem();
}

/**
 * 🎪 Función legacy para event delegation
 * @deprecated Usar initPasswordToggleSystem() en su lugar
 */
function setupPasswordTogglesDelegated() {
    console.warn('⚠️ setupPasswordTogglesDelegated() está deprecated. Usa initPasswordToggleSystem()');
    return initPasswordToggleSystem();
}

// ================================================
// 🏁 AUTO-INICIALIZACIÓN
// ================================================

// Inicializar automáticamente cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPasswordToggleSystem);
} else {
    // DOM ya está listo
    initPasswordToggleSystem();
}

// ================================================
// 📤 EXPORTAR PARA USO GLOBAL
// ================================================

// Hacer disponibles las funciones globalmente
window.initPasswordToggleSystem = initPasswordToggleSystem;
window.passwordToggleManager = passwordToggleManager;

// Para debugging en consola
window.passwordToggleDebug = {
    manager: () => passwordToggleManager,
    stats: () => passwordToggleManager?.getUsageStats(),
    reinit: () => passwordToggleManager?.reinitialize(),
    showPassword: (id) => passwordToggleManager?.showPassword(id),
    hidePassword: (id) => passwordToggleManager?.hidePassword(id)
};

// ================================================
// 📝 EJEMPLO DE USO
// ================================================

/*
HTML REQUERIDO:
<div class="input-wrapper">
    <input type="password" id="password" />
    <button type="button" class="password-toggle" aria-label="Mostrar contraseña">
        <i class="fas fa-eye"></i>
    </button>
</div>

INICIALIZACIÓN EN TU ARCHIVO:
// Opción 1: Auto-inicialización (recomendado)
// No hacer nada, se inicializa automáticamente

// Opción 2: Inicialización manual
document.addEventListener('DOMContentLoaded', () => {
    initPasswordToggleSystem();
});

// Opción 3: Para SPA o contenido dinámico
function loadNewContent() {
    // ... cargar contenido ...
    passwordToggleManager.reinitialize();
}
*/
