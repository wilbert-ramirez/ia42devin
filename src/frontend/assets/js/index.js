// Lógica específica para index.html

// Verificar si el usuario ya está logueado al cargar index.html
/*document.addEventListener('DOMContentLoaded', function() {
    if (typeof api !== 'undefined' && api.isAuthenticated() && !api.isTokenExpired()) {
        console.log('✅ Usuario ya logueado, redirigiendo al dashboard...');
        
        // Mostrar mensaje
        if (typeof notify === 'function') {
            notify('Ya tienes una sesión activa. Redirigiendo...', 'info', 2000);
        }
        
        // Redirigir al dashboard
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
        return;
    }
    
    // Si no está logueado, continuar con index.html normal
    console.log('Usuario no logueado, mostrando página de inicio');



});*/

let currentUserData = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing index.html specific components...');

    initializeScrollSpy();
    setupIndexSpecificEventListeners();


    // Si necesitas que algún modal se muestre al cargar la página (ej. por un parámetro URL),
    // podrías llamarlo aquí. Por ejemplo:
    // handleUrlParamsForModals();
});




    function enviarFormularioContacto() {
    const fullNameInput = document.getElementById('contactFullName');
    const emailInput = document.getElementById('contactEmail');
    const messageInput = document.getElementById('contactMessage');

    const full_name = fullNameInput?.value.trim();
    const email = emailInput?.value.trim();
    const message = messageInput?.value.trim();

    if (!full_name || !email || !message) {
        alert('❗ Por favor completa todos los campos del formulario.');
        return;
    }

    fetch('/api/v1/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name, email, message })
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            notify('Mensaje enviado correctamente. ¡Prometemos una atención rápida y eficiente para resolver tus necesidades lo antes posible!', 'success');
            
            fullNameInput.value = '';
            emailInput.value = '';
            messageInput.value = '';
        } else {
            notify('❌ Error: ' + data.error, 'error');
        }
    })
    .catch(err => {
        console.error('Error al enviar mensaje:', err);
        notify('❌ Hubo un error al enviar el mensaje.', 'error');
    });
}

// Agregar listener después de que el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    const enviarBtn = document.getElementById('enviarFormularioContacto');
    if (enviarBtn) {
        enviarBtn.addEventListener('click', enviarFormularioContacto);
    }

    
});

// Configurar event listeners específicos de index.html
function setupIndexSpecificEventListeners() {
    // Listeners para los botones de cierre de modales de index.html
    document.querySelectorAll('.modal .close[data-modal-id]').forEach(button => {
        button.addEventListener('click', function() {
            // closeModal es una función global definida en main.js
            if (typeof closeModal === 'function') {
                closeModal(this.dataset.modalId);
            }
        });
    });

    // Listener para el enlace de "Olvidaste tu contraseña" en index.html
    const forgotPasswordLinkIndex = document.getElementById('showForgotPasswordLinkIndex');
    if (forgotPasswordLinkIndex) {
        forgotPasswordLinkIndex.addEventListener('click', function(e) {
            e.preventDefault();
            // closeModal y showForgotPasswordModal (definida abajo)
            if (typeof closeModal === 'function') closeModal('loginModal'); // Cierra el modal de login si está abierto
            showForgotPasswordModal(); // Esta es la local de index.js
        });
    }

    // Listener para el botón de cierre de notificación de index.html
    const closeNotificationButton = document.getElementById('closeNotificationBtn');
    if (closeNotificationButton) {
        // Asumimos que closeNotification es ahora una función global de main.js
        if (typeof closeNotification === 'function') {
            closeNotificationButton.addEventListener('click', closeNotification);
        } else if (typeof window.closeNotification === 'function') { // Fallback si se expuso así
             closeNotificationButton.addEventListener('click', window.closeNotification);
        } else {
            console.warn('Función closeNotification no encontrada globalmente para el botón de index.html');
        }
    }
}

// Scroll Spy (para actualizar enlace activo en scroll, principalmente en index.html)
function initializeScrollSpy() {
    const currentPath = window.location.pathname;
    // Solo ejecutar en index.html (que se sirve en /app/ o /app/index.html debido a <base href="/app/">)
    if (!(currentPath === '/app/' || currentPath.endsWith('/app/index.html'))) {
        return;
    }

    const sections = document.querySelectorAll('section[id]');
    if (!sections.length) {
        console.log('ScrollSpy: No sections with ID found on index.html');
        return;
    }

    window.addEventListener('scroll', () => {
        let currentSectionId = '';
        const header = document.querySelector('.header.fixed'); 
        const headerHeight = header ? header.offsetHeight : (document.querySelector('.header')?.offsetHeight || 70);

        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            if (window.scrollY >= sectionTop - headerHeight - 50) { // Offset adicional
                currentSectionId = section.getAttribute('id');
            }
        });

        // Llama a updateActiveNavLinks de main.js si está disponible globalmente
        // updateActiveNavLinks debería manejar el caso de currentSectionId vacío
        // para activar 'home' si es necesario.
        if (typeof updateActiveNavLinks === 'function') {
            updateActiveNavLinks(currentSectionId);
        }
    });
    console.log('✅ ScrollSpy inicializado para index.html');
}


// Funciones para mostrar modales específicos de index.html
// Estas funciones utilizan showModal y closeAllModals de main.js

function showLoginModal() {
    if (typeof closeAllModals === 'function') closeAllModals();
    if (typeof showModal === 'function') showModal('loginModal');
}

function showRegisterModal() {
    if (typeof closeAllModals === 'function') closeAllModals();
    if (typeof showModal === 'function') showModal('registerModal');
}

function showForgotPasswordModal() {
    // No cerramos todos los modales aquí si se abre desde el modal de login
    if (typeof showModal === 'function') showModal('forgotPasswordModal');
}

// Hacer funciones accesibles globalmente si son llamadas desde HTML inline (onclick)
// o si otros scripts podrían necesitarlas (aunque es mejor usar event listeners).
window.showLoginModal = showLoginModal;
window.showRegisterModal = showRegisterModal;
window.showForgotPasswordModal = showForgotPasswordModal;

console.log('✅ index.js cargado y listo.');
