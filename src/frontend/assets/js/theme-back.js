// Sistema de temas para IA42

class ThemeManager {
    constructor() {
        this.currentTheme = this.getStoredTheme() || this.getSystemTheme();
        this.init();
    }

    init() {
        this.applyTheme(this.currentTheme);
        this.updateThemeIcons();
        this.setupEventListeners();
    }

    getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }

    getStoredTheme() {
        return localStorage.getItem('ia42-theme');
    }

    storeTheme(theme) {
        localStorage.setItem('ia42-theme', theme);
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        this.storeTheme(theme);
        this.updateThemeIcons();
        
        // Emitir evento personalizado para otros componentes
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme }
        }));
    }

    updateThemeIcons() {
        const lightIcon = document.getElementById('lightIcon');
        const darkIcon = document.getElementById('darkIcon');
        
        if (lightIcon && darkIcon) {
            if (this.currentTheme === 'light') {
                lightIcon.classList.add('active');
                darkIcon.classList.remove('active');
            } else {
                lightIcon.classList.remove('active');
                darkIcon.classList.add('active');
            }
        }
    }

    toggle() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        
        // Mostrar notificación
        this.showThemeNotification(newTheme);
        
        // Animación suave del toggle
        this.animateToggle();
    }

    showThemeNotification(theme) {
        const message = theme === 'light' 
            ? '☀️ Tema claro activado' 
            : '🌙 Tema oscuro activado';
        
        // Usar la función de notificación existente si está disponible
        if (typeof showNotification === 'function') {
            showNotification(message, 'success');
        }
    }

    animateToggle() {
        const toggleButton = document.querySelector('.theme-switch');
        if (toggleButton) {
            toggleButton.style.transform = 'scale(0.95)';
            setTimeout(() => {
                toggleButton.style.transform = 'scale(1)';
            }, 150);
        }
    }

    setupEventListeners() {
        // Escuchar cambios en las preferencias del sistema
        window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
            if (!this.getStoredTheme()) {
                this.applyTheme(e.matches ? 'light' : 'dark');
            }
        });

        // Escuchar eventos de teclado para accesibilidad
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Shift + L para cambiar tema
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'L') {
                e.preventDefault();
                this.toggle();
            }
        });
    }

    // Método para forzar un tema específico
    setTheme(theme) {
        if (theme === 'light' || theme === 'dark') {
            this.applyTheme(theme);
        }
    }

    // Obtener el tema actual
    getCurrentTheme() {
        return this.currentTheme;
    }

    // Verificar si es tema oscuro
    isDark() {
        return this.currentTheme === 'dark';
    }

    // Verificar si es tema claro
    isLight() {
        return this.currentTheme === 'light';
    }
}

// Instancia global del gestor de temas
let themeManager;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    themeManager = new ThemeManager();
});

// Función global para alternar tema (usada por el botón)
function toggleTheme() {
    if (themeManager) {
        themeManager.toggle();
    }
}

// Función global para establecer tema específico
function setTheme(theme) {
    if (themeManager) {
        themeManager.setTheme(theme);
    }
}

// Función para obtener el tema actual
function getCurrentTheme() {
    return themeManager ? themeManager.getCurrentTheme() : 'dark';
}

// Exportar para uso en otros módulos si es necesario
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ThemeManager };
}