// ====================================
// SISTEMA DE TEMAS UNIFICADO IA42
// Versión mejorada compatible con todas las páginas
// ====================================

// Variables globales
let currentTheme = 'dark';

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 Sistema de temas IA42 iniciado');
    initializeTheme();
    setupKeyboardShortcut();
});

// Inicializar tema
function initializeTheme() {
    // Obtener tema guardado o usar tema del sistema
    const savedTheme = localStorage.getItem('ia42-theme');
    const systemTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    
    currentTheme = savedTheme || systemTheme;
    
    console.log('🔧 Tema inicial:', currentTheme);
    
    // Aplicar tema
    applyTheme(currentTheme);
    updateUI();
    
    // Configurar botón(es) de tema
    setupThemeButtons();
    
    // Detectar cambios en preferencia del sistema
    setupSystemThemeDetection();
}

// Configurar todos los botones de tema en la página
function setupThemeButtons() {
    // Buscar diferentes tipos de botones de tema
    const selectors = [
        '.theme-switch',
        '.theme-toggle',           // AGREGADO: buscar también el contenedor
        '#themeToggle', 
        '[data-toggle="theme"]',
        '[onclick*="toggleTheme"]'
    ];
    
    let buttonFound = false;
    
    selectors.forEach(selector => {
        const buttons = document.querySelectorAll(selector);
        buttons.forEach(btn => {
            if (btn) {
                // Remover onclick del HTML si existe
                btn.removeAttribute('onclick');
                
                // Agregar event listener
                btn.addEventListener('click', function(e) {
                    e.preventDefault();
                    console.log('🔄 Botón de tema clicado:', selector);
                    toggleTheme();
                });
                
                // AGREGADO: También escuchar clicks en iconos dentro del toggle
                const icons = btn.querySelectorAll('.theme-icon, .fa-sun, .fa-moon');
                icons.forEach(icon => {
                    icon.addEventListener('click', function(e) {
                        e.stopPropagation(); // Evitar doble click
                        console.log('🔄 Icono de tema clicado');
                        toggleTheme();
                    });
                });
                
                // Agregar atributos de accesibilidad
                btn.setAttribute('aria-label', 'Cambiar tema');
                btn.setAttribute('title', 'Cambiar tema (Ctrl+Shift+L)'); // CORREGIDO: L en lugar de T
                
                buttonFound = true;
                console.log('✅ Event listener agregado a:', selector);
            }
        });
    });
    
    if (!buttonFound) {
        console.warn('⚠️ No se encontraron botones de tema');
        console.log('🔍 Buscando en el DOM...');
        
        // Debug: listar todos los elementos que podrían ser botones de tema
        const possibleButtons = document.querySelectorAll('button, .btn, [role="button"]');
        console.log('Posibles botones encontrados:', possibleButtons.length);
    }
}

// Configurar atajo de teclado Ctrl+Shift+T
function setupKeyboardShortcut() {
    document.addEventListener('keydown', function(e) {
        // Ctrl+Shift+T para cambiar tema
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
            e.preventDefault();
            console.log('⌨️ Atajo de teclado activado: Ctrl+Shift+T');
            toggleTheme();
        }
    });
    
    console.log('⌨️ Atajo de teclado configurado: Ctrl+Shift+T');
}

// Detectar cambios en preferencia del sistema
function setupSystemThemeDetection() {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    
    mediaQuery.addEventListener('change', function(e) {
        // Solo cambiar si no hay preferencia guardada manualmente
        const hasManualPreference = localStorage.getItem('ia42-theme-manual');
        if (!hasManualPreference) {
            const systemTheme = e.matches ? 'light' : 'dark';
            console.log('🖥️ Tema del sistema cambió a:', systemTheme);
            applyTheme(systemTheme);
        }
    });
}

// Aplicar tema
function applyTheme(theme) {
    console.log('🎨 Aplicando tema:', theme);
    
    // Cambiar atributo data-theme (compatible con ambos sistemas)
    // document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ia42-theme', theme);
    
      // ——— Actualizar logo según el tema ———
    const logoEl = document.getElementById('appLogo');
    if (logoEl) {
      logoEl.src =
         theme === 'light'
           ? 'assets/img/logo_fondo_blanco_short.png'
           : 'assets/img/logo_fondo_negro_short.png';
    }
    
    // También soportar el sistema anterior (por compatibilidad)
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        document.body.classList.remove('dark-theme');
    } else {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
    }
    
    // Guardar en localStorage
    //localStorage.setItem('ia42-theme', theme);
    currentTheme = theme;
    
    // Actualizar toda la UI
    updateUI();
    
    // Disparar evento personalizado para otras partes de la app
    window.dispatchEvent(new CustomEvent('themeChanged', { 
        detail: { theme: theme } 
    }));
}

// Actualizar toda la interfaz de usuario
function updateUI() {
    updateIcons();
    updateToggleSwitches();
    updateThemeClasses();
}

// Actualizar iconos del toggle (sistema original)
function updateIcons() {
    const lightIcon = document.getElementById('lightIcon');
    const darkIcon = document.getElementById('darkIcon');
    
    console.log('🔍 Actualizando iconos para tema:', currentTheme);
    
    if (lightIcon && darkIcon) {
        // Remover clase active de ambos
        lightIcon.classList.remove('active');
        darkIcon.classList.remove('active');
        
        // Agregar clase active al icono correspondiente
        if (currentTheme === 'light') {
            lightIcon.classList.add('active');
            lightIcon.style.color = 'var(--primary, #FFD700)';
            darkIcon.style.color = 'var(--text-muted, #6B7280)';
        } else {
            darkIcon.classList.add('active');
            darkIcon.style.color = 'var(--primary, #FFD700)';
            lightIcon.style.color = 'var(--text-muted, #6B7280)';
        }
        
        console.log('✅ Iconos actualizados');
    }
    
    // También buscar iconos con clases genéricas
    const allLightIcons = document.querySelectorAll('.theme-icon.light, .fa-sun');
    const allDarkIcons = document.querySelectorAll('.theme-icon.dark, .fa-moon');
    
    allLightIcons.forEach(icon => {
        icon.style.opacity = currentTheme === 'light' ? '1' : '0.5';
        icon.style.color = currentTheme === 'light' ? 'var(--primary, #FFD700)' : 'var(--text-muted, #6B7280)';
    });
    
    allDarkIcons.forEach(icon => {
        icon.style.opacity = currentTheme === 'dark' ? '1' : '0.5';
        icon.style.color = currentTheme === 'dark' ? 'var(--primary, #FFD700)' : 'var(--text-muted, #6B7280)';
    });
}

// Actualizar switches visuales (para páginas modernas)
function updateToggleSwitches() {
    const switches = document.querySelectorAll('.theme-switch');

    switches.forEach(switchEl => {
        // Para switches con ::before (como en login.html)
        if (currentTheme === 'light') {
            switchEl.classList.add('light');
        } else {
            switchEl.classList.remove('light');
        }
        
        // Actualizar atributo data para CSS
        switchEl.setAttribute('data-theme', currentTheme);
    });
}

// Actualizar clases de tema en elementos específicos
function updateThemeClasses() {
    // Buscar elementos que necesiten clases específicas de tema
    const themeElements = document.querySelectorAll('[data-theme-target]');
    
    themeElements.forEach(element => {
        element.classList.remove('light-mode', 'dark-mode');
        element.classList.add(currentTheme + '-mode');
    });
}

// Función para alternar tema (llamada por el botón)
function toggleTheme() {
    console.log('🔄 Toggle tema presionado');
    
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    console.log('🔄 Cambiando de', currentTheme, 'a', newTheme);
    
    // Marcar como preferencia manual
    localStorage.setItem('ia42-theme-manual', 'true');
    
    applyTheme(newTheme);
    
    // Mostrar notificación (compatible con diferentes sistemas)
    const message = newTheme === 'light' ? 'Tema claro activado' : 'Tema oscuro activado';
    showThemeNotification(newTheme, message);
    
    // Animar el botón
    animateToggle();
}

// Mostrar notificación de cambio de tema
function showThemeNotification(theme, message) {
    // Intentar diferentes sistemas de notificación
    if (typeof showToast === 'function') {
        // Sistema moderno (login.html)
        showToast('success', 'Tema cambiado', message);
    } else if (typeof showNotification === 'function') {
        // Sistema original
        const icon = theme === 'light' ? '☀️' : '🌙';
        showNotification(icon + ' ' + message, 'success');
    } else {
        // Fallback: notificación simple
        createSimpleNotification(message, theme);
    }
    
    console.log('📢', message);
}

// Crear notificación simple como fallback
function createSimpleNotification(message, theme) {
    // Crear elemento de notificación temporal
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 1rem;
        right: 1rem;
        background: ${theme === 'light' ? '#fff' : '#333'};
        color: ${theme === 'light' ? '#333' : '#fff'};
        padding: 1rem 1.5rem;
        border-radius: 0.5rem;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        z-index: 9999;
        font-family: inherit;
        font-size: 0.875rem;
        animation: slideIn 0.3s ease-out;
        border: 1px solid #FFD700;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    // Remover después de 3 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
    
    // Agregar estilos de animación si no existen
    if (!document.querySelector('#theme-notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'theme-notification-styles';
        styles.textContent = `
            @keyframes slideIn {
                from { opacity: 0; transform: translateX(100%); }
                to { opacity: 1; transform: translateX(0); }
            }
            @keyframes slideOut {
                from { opacity: 1; transform: translateX(0); }
                to { opacity: 0; transform: translateX(100%); }
            }
        `;
        document.head.appendChild(styles);
    }
}

// Animar el botón
function animateToggle() {
    const toggleButtons = document.querySelectorAll('.theme-switch, #themeToggle');

    toggleButtons.forEach(button => {
        if (button) {
            button.style.transform = 'scale(0.9)';
            setTimeout(() => {
                button.style.transform = 'scale(1)';
            }, 150);
        }
    });
}

// ====================================
// FUNCIONES PÚBLICAS
// ====================================

// Función para establecer tema específico
function setTheme(theme) {
    if (theme === 'light' || theme === 'dark') {
        console.log('🎯 Estableciendo tema:', theme);
        localStorage.setItem('ia42-theme-manual', 'true');
        applyTheme(theme);
    } else {
        console.warn('❌ Tema inválido:', theme, 'Use "light" o "dark"');
    }
}

// Función para obtener tema actual
function getCurrentTheme() {
    return currentTheme;
}

// Función para resetear a preferencia del sistema
function resetToSystemTheme() {
    localStorage.removeItem('ia42-theme');
    localStorage.removeItem('ia42-theme-manual');
    
    const systemTheme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    console.log('🖥️ Reseteando a tema del sistema:', systemTheme);
    applyTheme(systemTheme);
}

// Test function - para debugging
function testTheme() {
    console.log('🧪 Test de tema');
    console.log('Tema actual:', currentTheme);
    console.log('Elemento HTML:', document.documentElement.getAttribute('data-theme'));
    console.log('localStorage:', localStorage.getItem('ia42-theme'));
    toggleTheme();
}

// ====================================
// EXPORTS GLOBALES
// ====================================

// Hacer funciones disponibles globalmente (compatibilidad)
window.toggleTheme = toggleTheme;
window.setTheme = setTheme;
window.getCurrentTheme = getCurrentTheme;
window.resetToSystemTheme = resetToSystemTheme;
window.testTheme = testTheme;

// Objeto principal para acceso organizado
window.ThemeManager = {
    toggle: toggleTheme,
    set: setTheme,
    get: getCurrentTheme,
    reset: resetToSystemTheme,
    initializePageThemeButtons: setupThemeButtons // Exponer para main.js
};

// Log de inicialización
console.log('🚀 Sistema de temas IA42 cargado completamente');
console.log('💡 Funciones disponibles: toggleTheme(), setTheme(), getCurrentTheme()');
console.log('⌨️ Atajo: Ctrl+Shift+T');