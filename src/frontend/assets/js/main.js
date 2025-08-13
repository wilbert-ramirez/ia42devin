const currentPath = window.location.pathname;

// Lógica principal del frontend

// Variables globales
let currentUser = null;
const API_BASE = "/api/v1";

// Inicialización cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", function () {
  initializeCommonComponents();
});



/**
 * 🔧 Actualizar interfaz de index.html para usuario logueado
 */
function updateIndexForLoggedUser(userName) {
  const ctaButtons = document.querySelectorAll(
    ".btn-cta-primary, .hero-buttons .btn-primary"
  );
  ctaButtons.forEach((btn) => {
    if (
      btn.textContent.includes("Comenzar") ||
      btn.textContent.includes("Crear Cuenta")
    ) {
      btn.innerHTML = `<i class="fas fa-tachometer-alt"></i> Seguir aprendiendo`;
      btn.href = "lx-student.html";
    }
  });

  const secondaryButtons = document.querySelectorAll(
    ".btn-cta-secondary, .hero-buttons .btn-secondary"
  );
  secondaryButtons.forEach((btn) => {
    if (
      btn.textContent.includes("Iniciar Sesión") ||
      btn.textContent.includes("Ya tengo cuenta")
    ) {
      btn.innerHTML = `<i class="fas fa-sign-out-alt"></i> Cerrar Sesión`;
      btn.onclick = () => api.logout();
      btn.removeAttribute("href");
    }
  });

  const headerButtons = document.querySelectorAll(".header .btn");
  headerButtons.forEach((btn) => {
    if (btn.textContent.includes("Registrarse")) {
      btn.innerHTML = `<i class="fas fa-user"></i> ${userName}`;
      btn.href = "dashboard.html";
    }
    if (btn.textContent.includes("Iniciar Sesión")) {
      btn.innerHTML = `<i class="fas fa-tachometer-alt"></i> Dashboard`;
      btn.href = "dashboard.html";
    }
  });
}

// Inicializar componentes comunes (header, footer) y funcionalidades globales
async function initializeCommonComponents() {
  console.log("Initializing common components...");

  await Promise.all([
    loadHtmlComponent("partials/_header.html", "header-placeholder"),

    loadHtmlComponent("partials/_footer.html", "footer-placeholder"),
  ]);

  setupCommonEventListeners();

  if (
    typeof window.ThemeManager !== "undefined" &&
    typeof window.ThemeManager.initializePageThemeButtons === "function"
  ) {
    console.log("Re-initializing theme buttons after header/footer load...");
    window.ThemeManager.initializePageThemeButtons();
  }

  initializeApp();

  const currentYearSpan = document.getElementById("currentYear");
  if (currentYearSpan) {
    currentYearSpan.textContent = new Date().getFullYear();
  }

  console.log("Common components initialized.");
}

// Configurar event listeners comunes
function setupCommonEventListeners() {
  const menuToggleButton = document.getElementById("menuToggleBtn");
  if (menuToggleButton) {
    menuToggleButton.addEventListener("click", toggleMenu);
  }

  setupSmoothScrolling();

  window.addEventListener("hashchange", updateActiveNavLinks);

  window.addEventListener("click", function (event) {
    if (event.target.classList.contains("modal")) {
      const modalId = event.target.id;
      if (modalId && typeof closeModal === "function") closeModal(modalId);
    }
  });

  updateActiveNavLinks();

  setupFooterLinkHover();

  window.addEventListener("error", function (event) {
    console.error("Error global:", event.error);
    if (typeof showNotification === "function") {
      showNotification(
        "Ha ocurrido un error inesperado. Por favor recarga la página.",
        "error"
      );
    }
  });

  window.addEventListener("unhandledrejection", function (event) {
    console.error("Error de promesa no capturada:", event.reason);
    if (typeof showNotification === "function") {
      showNotification(
        "Ha ocurrido un error de conexión. Por favor verifica tu conexión a internet.",
        "error"
      );
    }
  });
}

// Cargar HTML en un placeholder
async function loadHtmlComponent(url, placeholderId) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Componente HTML no encontrado: ${url}`);
        return;
      }
      throw new Error(
        `Failed to load ${url}: ${response.status} ${response.statusText}`
      );
    }
    const html = await response.text();
    const placeholder = document.getElementById(placeholderId);
    if (placeholder) {
      placeholder.innerHTML = html;
    } else {
      console.warn(`Placeholder with ID '${placeholderId}' not found.`);
    }
  } catch (error) {
    console.error(`Error loading component ${url}:`, error);
  }
}

// Inicializar aplicación
function initializeApp() {
  if (
    typeof api !== "undefined" &&
    api.isAuthenticated &&
    api.isAuthenticated() &&
    api.isTokenExpired &&
    !api.isTokenExpired()
  ) {
    loadUserData();
  } else {
    const btnClose = document.getElementById("user-close");
    const btnDashboardLink = document.getElementById("dashboardLink");
    if (btnClose) {
      btnClose.style.display = "none";
      btnDashboardLink.style.display = "none";
    } else {
      console.log("Elemento con ID user-close no encontrado");
    }
  }

  const tellFriendBtn = document.getElementById("tellFriendBtn");

  if (tellFriendBtn) {
    tellFriendBtn.addEventListener("click", async () => {
      const shareData = {
        title: "¡Únete a IA42!",
        text: `Descubre cursos increíbles en IA42. ${currentUserData ? `¡Recomendado por ${currentUserData.name}!` : ""}`,
        url: window.location.origin + "/app/", // Base URL of the platform
      };

      try {
        // Try Web Share API
        if (
          navigator.share &&
          navigator.canShare &&
          navigator.canShare(shareData)
        ) {
          await navigator.share(shareData);
          showNotification("¡Gracias por compartir!", "success");
        } else {
          // Fallback to copying link to clipboard
          await navigator.clipboard.writeText(shareData.url);
          showNotification("Enlace copiado al portapapeles", "success");
        }
      } catch (error) {
        console.error("Error sharing:", error);
        showNotification(
          "Error al compartir. Copia el enlace manualmente.",
          "error"
        );
      }
    });
  }
}

// Cargar datos del usuario autenticado
async function loadUserData() {
  try {
    if (typeof api !== "undefined" && api.getProfile) {
      const response = await api.getProfile();
      if (response.success) {
        currentUser = response.data;
        await Promise.all([
          loadHtmlComponent(
            "partials/_headerdashboard.html",
            "header-placeholder-dashboard"
          ),
        ]);
        const logoutButton = nav.querySelector(".logout");
        if (logoutButton && typeof api !== "undefined" && api.logout) {
          logoutButton.removeAttribute("onclick");
          logoutButton.addEventListener("click", api.logout);
        }
        // Ocultar btn-register
        const btnRegister = document.getElementById("btn-register");
        if (btnRegister) {
          btnRegister.style.display = "none";
        } else {
          console.log("Elemento con ID btn-register no encontrado");
        }

        // Ocultar btn-login
        const btnLogin = document.getElementById("btn-login");
        const btnCaracteristicas = document.getElementById("caracteristicas");
        const btntellFriendBtn = document.getElementById("tellFriendBtn");
        const btnAcerca = document.getElementById("acerca");
        if (btnLogin) {
          btnLogin.style.display = "none";
          btnCaracteristicas.style.display = "none";
          btnAcerca.style.display = "none";
          btntellFriendBtn.style.display = "block";
        } else {
          console.log("Elemento con ID btn-login no encontrado");
        }

        const btnMisExps = document.getElementById("misexperiencia");
        if (btnMisExps) {
          if (
            currentPath.endsWith("/app/lx-student.html") ||
            currentPath.endsWith("lx-student.html")
          ) {
            btnMisExps.style.display = "none";
          } else {
            btnMisExps.style.display = "block";
          }
        } else {
          console.log("Elemento con ID btn-login no encontrado");
        }
        const btndashboardLink = nav.querySelector(".link-dashboard");
        const currentPath = window.location.pathname;
        if (
          currentPath.endsWith("/app/dashboard.html") ||
          currentPath.endsWith("dashboard.html")
        ) {
          if (btndashboardLink) {
            btndashboardLink.style.display = "none";
          }
        } else {
          if (btndashboardLink) {
            btndashboardLink.style.display = "block";
          }
        }
        updateUIForAuthenticatedUser();
      }
    }
  } catch (error) {
    console.error("Error cargando datos del usuario:", error);
    if (typeof api !== "undefined" && api.logout) api.logout();
  }
}

// Actualizar UI para usuario autenticado
function updateUIForAuthenticatedUser() {
  const nav = document.getElementById("user-name");

  if (nav && currentUser) {
    nav.innerHTML = `${currentUser.name}
        `;
    setupSmoothScrolling();
    updateActiveNavLinks();
  }
}

// Gestión de modales
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "flex";
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "none";
    modal.classList.remove("show");
    document.body.style.overflow = "auto";
  }
}

function closeAllModals() {
  const modals = document.querySelectorAll(".modal");
  modals.forEach((modal) => {
    closeModal(modal.id);
  });
  document.body.style.overflow = "auto";
}

// Navegación suave
function setupSmoothScrolling() {
  const links = document.querySelectorAll('a[href^="#"]');
  links.forEach((link) => {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      const targetId = this.getAttribute("href").substring(1);
      const targetElement = document.getElementById(targetId);
      if (targetElement) {
        const header = document.querySelector(".header.fixed");
        const headerHeight = header ? header.offsetHeight : 0;
        const targetPosition = targetElement.offsetTop - headerHeight;
        window.scrollTo({
          top: targetPosition,
          behavior: "smooth",
        });
        if (typeof updateActiveNavLinks === "function")
          updateActiveNavLinks(targetId);
      }
    });
  });
}

// Actualizar enlaces de navegación activos
function updateActiveNavLinks(currentSectionId = null) {
  const navLinks = document.querySelectorAll("#nav .nav-link");
  if (!navLinks.length) return;
  const currentPagePath =
    window.location.pathname.split("/").pop() || "index.html";
  const currentHash = window.location.hash;
  navLinks.forEach((link) => {
    link.classList.remove("active");
    const targetPage = link.dataset.navTargetPage;
    const targetSection = link.dataset.navTargetSection;
    const normalizedCurrentPage = currentPagePath.replace(".html", "");
    if (targetPage === "index" && normalizedCurrentPage === "index") {
      if (currentSectionId && targetSection === currentSectionId) {
        link.classList.add("active");
      } else if (
        !currentSectionId &&
        currentHash &&
        targetSection &&
        currentHash === `#${targetSection}`
      ) {
        link.classList.add("active");
      } else if (
        !currentSectionId &&
        !currentHash &&
        targetSection === "home"
      ) {
        link.classList.add("active");
      }
    } else if (targetPage === normalizedCurrentPage && targetPage !== "index") {
      if (targetPage !== "index" && !targetSection && !currentHash) {
        link.classList.add("active");
      }
    }
  });
}

// Menú móvil
function toggleMenu() {
  const nav = document.getElementById("nav");
  debugger;
  if (nav) {
    nav.classList.toggle("show");
  }
}

function notify(message, type = "success") {
  const container = document.getElementById("notificationContainer");
  if (!container) return;

  const notif = document.createElement("div");
  notif.classList.add("notification-box", type);
  notif.innerHTML = `
        <i class="fas ${getIconByType(type)}"></i>
        <span>${message}</span>
    `;

  container.appendChild(notif);

  // Remover después de animación (~3.6s)
  setTimeout(() => {
    notif.remove();
  }, 3600);
}

function getIconByType(type) {
  switch (type) {
    case "success":
      return "fa-check-circle";
    case "error":
      return "fa-times-circle";
    case "info":
      return "fa-info-circle";
    case "warning":
      return "fa-exclamation-triangle";
    default:
      return "fa-bell";
  }
}

// Gestión de notificaciones
function showNotification(message, type = "success", duration = 5000) {
  const notificationElement = document.getElementById("notification");
  const notificationTextElement = document.getElementById("notificationText");
  if (notificationElement && notificationTextElement) {
    notificationElement.className = "notification";
    notificationElement.classList.add(type);
    notificationTextElement.textContent = message;
    const icon = notificationElement.querySelector("i");
    if (icon) {
      icon.className = getNotificationIcon(type);
    }
    notificationElement.classList.add("show");
    if (duration > 0) {
      setTimeout(() => {
        closeNotification();
      }, duration);
    }
  } else {
    console.warn("Sistema de notificación visual no encontrado, usando alert.");
    alert(`${type.toUpperCase()}: ${message}`);
  }
}

function getNotificationIcon(type) {
  switch (type) {
    case "success":
      return "fas fa-check-circle";
    case "error":
      return "fas fa-exclamation-circle";
    case "warning":
      return "fas fa-exclamation-triangle";
    default:
      return "fas fa-info-circle";
  }
}

function closeNotification() {
  const notificationElement = document.getElementById("notification");
  if (notificationElement) {
    notificationElement.classList.remove("show");
  }
}

window.showNotification = showNotification;

// FORM UTILITY FUNCTIONS
window.isValidEmail = function (email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(String(email).toLowerCase());
};

window.showFieldError = function (fieldId, message) {
  const errorElement = document.getElementById(fieldId + "Error");
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.style.display = "block";
  } else {
    console.warn(`Error element for field '${fieldId}' not found.`);
  }
};

window.hideFieldError = function (fieldId) {
  const errorElement = document.getElementById(fieldId + "Error");
  if (errorElement) {
    errorElement.textContent = "";
    errorElement.style.display = "none";
  }
};

window.clearFormErrors = function (formId) {
  const form = document.getElementById(formId);
  if (form) {
    const errorElements = form.querySelectorAll(
      ".field-error, .register-field-error"
    );
    errorElements.forEach((el) => {
      el.textContent = "";
      el.style.display = "none";
    });
  } else {
    console.warn(`Form with ID '${formId}' not found for clearing errors.`);
  }
};

window.updateHeaderAuthState = function () {
  console.log(
    "Attempting to update header auth state via updateHeaderAuthState..."
  );
  if (typeof initializeApp === "function") {
    initializeApp();
  } else {
    console.warn(
      "initializeApp function not found to update header auth state."
    );
  }
};

// Utilidades
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("es-ES", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatCurrency(amount) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

// Hover de enlaces del footer
function setupFooterLinkHover() {
  const footerPlaceholder = document.getElementById("footer-placeholder");
  const observer = new MutationObserver((mutationsList, observer) => {
    const footerLinks = footerPlaceholder.querySelectorAll(".footer-link");
    footerLinks.forEach((link) => {
      const originalColor = getComputedStyle(link).color;
      link.addEventListener("mouseover", function () {
        this.style.color = "var(--primary)";
      });
      link.addEventListener("mouseout", function () {
        this.style.color = originalColor;
      });
    });
    if (footerLinks.length > 0) observer.disconnect();
  });
  if (footerPlaceholder)
    observer.observe(footerPlaceholder, { childList: true, subtree: true });
}

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

// Debug de autenticación
window.debugAuth = {
  status: () => {
    console.log("=== DEBUG AUTH STATUS ===");
    console.log("Token:", localStorage.getItem("token"));
    console.log("User:", localStorage.getItem("user"));
    console.log("API available:", typeof api !== "undefined");
    console.log(
      "Authenticated:",
      api?.isAuthenticated
        ? api.isAuthenticated()
        : "api.isAuthenticated no definido"
    );
    console.log(
      "Token expired:",
      api?.isTokenExpired
        ? api.isTokenExpired()
        : "api.isTokenExpired no definido"
    );
    console.log("Current page:", window.location.pathname);
    console.log("========================");
  },
  goDashboard: () => {
    console.log("🚀 Forzando navegación al dashboard...");
    window.location.href = "dashboard.html";
  },
  forceLogout: () => {
    console.log("🚪 Forzando logout...");
    if (api?.clearAllSessionData) {
      api.clearAllSessionData();
    }
    window.location.href = "login.html";
  },
  simulateLoggedIndex: () => {
    if (typeof updateIndexForLoggedUser === "function") {
      updateIndexForLoggedUser("Usuario Test");
    } else {
      console.warn("updateIndexForLoggedUser no está definido");
    }
  },
};

console.log("🛠️ debugAuth inicializado correctamente");

// Estilos de animación para toasts
const toastAnimationStyles = `
@keyframes toastFadeIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes toastFadeOut {
    from {
        opacity: 1;
        transform: translateY(0);
    }
    to {
        opacity: 0;
        transform: translateY(20px);
    }
}

.toast {
    animation: toastFadeIn 0.4s ease-out;
}

.toast.hide {
    animation: toastFadeOut 0.4s ease-in forwards;
}
`;

// const styleSheet = document.createElement('style');
// styleSheet.textContent = toastAnimationStyles;
// document.head.appendChild(styleSheet);
