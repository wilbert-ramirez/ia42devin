// Configuración de la API
const API_BASE_URL = window.location.origin.includes("localhost")
  ? "http://localhost:3000/api/v1"
  : "/api/v1"; // Para producción: usa ruta relativa

// Cliente API
class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem("token");
    this.user;
  }

  // Obtener headers por defecto
  getHeaders(includeAuth = false) {
    const headers = {
      "Content-Type": "application/json",
    };

    if (includeAuth && this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Método para realizar peticiones HTTP
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: this.getHeaders(options.auth),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      // 🆕 DETECTAR TOKEN INVALIDADO
      if (!response.ok) {
        // Si el servidor dice que el token fue invalidado
        if (
          data.code === "TOKEN_BLACKLISTED" ||
          data.code === "TOKEN_VERSION_MISMATCH"
        ) {
          console.warn("⚠️ Token invalidado detectado:", data.code);

          // Limpiar datos locales
          this.clearAllSessionData();

          // Mostrar notificación
          if (typeof showNotification === "function") {
            const message =
              data.code === "TOKEN_BLACKLISTED"
                ? "Tu sesión fue cerrada"
                : "Tu sesión fue invalidada desde otro dispositivo";
            showNotification(message, "warning", 5000);
          }

          // Redirigir al login
          setTimeout(() => {
            window.location.href = "login.html";
          }, 2000);
        }

        let error;
        if (data.error) {
          error = data.error;
          showNotification(error, "error", 5000);
          return data;
        }
        data.message;

        error.status = response.status;
        throw error;
      }
      return data;
    } catch (error) {
      console.error("API Error:", error);
      throw error;
    }
  }

  // Métodos de autenticación
  async register(userData) {
    return this.request("/auth/register", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async login(credentials) {
    const result = await this.request("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });

    if (result.success && result.data && result.data.token) {
      this.setToken(result.data.token);
    }

    return result;
  }

  async forgotPassword(email) {
    return this.request("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token, newPassword) {
    return this.request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, newPassword }),
    });
  }

  async confirmEmail(token) {
    return this.request("/auth/confirm-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    });
  }

  async resendConfirmation(email) {
    return this.request("/auth/resend-confirmation", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  }

  // 🆕 LOGOUT GLOBAL - Invalida TODOS los tokens del usuario
  async logoutAllDevices() {
    return this.secureLogout(true);
  }

  // 🆕 VERIFICAR ESTADO DE SESIÓN
  async checkSessionStatus() {
    try {
      const result = await this.request("/auth/sessions", {
        method: "GET",
        auth: true,
      });
      return result;
    } catch (error) {
      console.error("❌ Error verificando sesión:", error);
      return { success: false, error: error.message };
    }
  }

  // 🆕 LIMPIAR TODOS LOS DATOS DE SESIÓN
  clearAllSessionData() {
    // Limpiar localStorage
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("hasLoggedInBefore");

    // Limpiar sessionStorage
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");

    // Limpiar variables globales si existen
    if (typeof currentUser !== "undefined") {
      currentUser = null;
    }

    console.log("🧹 Datos de sesión limpiados completamente");
  }

  async secureLogout(logoutAll = false) {
    try {
      const result = await this.request("/auth/logout", {
        method: "POST",
        auth: true,
        body: JSON.stringify({ logout_all_devices: logoutAll }),
      });

      if (result.success) {
        // Clear local token and session data AFTER server logout
        this.removeToken();
        this.clearAllSessionData();
        console.log("✅ Logout seguro completado:", result.message);
        return result;
      } else {
        throw new Error(result.error || "Error en logout");
      }
    } catch (error) {
      console.error("❌ Error en logout seguro:", error);
      // Clear local data even if server fails, for security
      this.removeToken();
      this.clearAllSessionData();
      throw error;
    }
  }

  async logout(options = {}) {
    const {
      redirectTo = "index.html",
      showNotification = true,
      logoutAll = true,
    } = options;

    try {
      if (showNotification && typeof window.showNotification === "function") {
        window.showNotification("🔄 Cerrando sesión...", "info", 0);
      }

      let result = { success: true };

      if (logoutAll) {
        const result = await api.logout({
          redirectTo: options.redirectTo || "index.html",
          showNotification: options.showNotification !== false,
          logoutAll: options.logoutAll || false,
        });

        if (!result.success) {
          throw new Error(result.error || "Error cerrando sesión global");
        }
      }

      // Siempre se ejecuta localmente
      this.removeToken?.();
      this.clearAllSessionData?.();

      if (showNotification && typeof window.showNotification === "function") {
        const message = logoutAll
          ? "✅ Sesión cerrada en todos los dispositivos"
          : "✅ Sesión cerrada exitosamente";
        window.showNotification(message, "success", 3000);
      }

      setTimeout(() => {
        window.location.href = redirectTo;
      }, 1500);

      return result;
    } catch (error) {
      console.error("❌ Error en logout:", error);

      // Asegurar limpieza local aunque haya fallo
      this.removeToken?.();
      this.clearAllSessionData?.();

      if (showNotification && typeof window.showNotification === "function") {
        window.showNotification(
          "⚠️ Error cerrando sesión. Se cerró solo localmente.",
          "warning",
          4000
        );
      }

      setTimeout(() => {
        window.location.href = redirectTo;
      }, 2000);

      return { success: false, error: error.message };
    }
  }

  // Métodos de usuario/estudiante
  async getProfile() {
    return this.request("/students/profile", {
      method: "GET",
      auth: true,
    });
  }

  async updateProfile(profileData) {
    return this.request("/students/profile", {
      method: "PUT",
      auth: true,
      body: JSON.stringify(profileData),
    });
  }

  async getActivity() {
    return this.request("/students/activity", {
      method: "GET",
      auth: true,
    });
  }

  // Métodos de cursos
  async getCourses() {
    return this.request("/courses", {
      method: "GET",
    });
  }

  async getMyCourses() {
    return this.request("/courses/subscription", {
      method: "GET",
    });
  }

  // Métodos de admin
  async getAdminDashboard() {
    return this.request("/admin/dashboard", {
      method: "GET",
      auth: true,
    });
  }

  async getUsers(page = 1, limit = 20) {
    return this.request(`/admin/users?page=${page}&limit=${limit}`, {
      method: "GET",
      auth: true,
    });
  }

  async assignRole(userId, roleName) {
    return this.request(`/admin/users/${userId}/roles`, {
      method: "POST",
      auth: true,
      body: JSON.stringify({ roleName }),
    });
  }

  async removeRole(userId, roleName) {
    return this.request(`/admin/users/${userId}/roles/${roleName}`, {
      method: "DELETE",
      auth: true,
    });
  }

  async getRoles() {
    return this.request("/admin/roles", {
      method: "GET",
      auth: true,
    });
  }

  // Gestión de tokens
  setToken(token) {
    this.token = token;
    localStorage.setItem("token", token);
  }

  removeToken() {
    this.token = null;
    localStorage.removeItem("token");
  }

  getToken() {
    return this.token;
  }

  // 🔄 MODIFICAR método isAuthenticated para verificar blacklist
  isAuthenticated() {
    console.log('[api.js] isAuthenticated: Verificando...');
    const token = this.getToken();
    if (!token) {
      console.log('[api.js] isAuthenticated: Falso (no hay token).');
      return false;
    }

    // Verificar si el token no está expirado
    if (this.isTokenExpired()) {
      console.log('[api.js] isAuthenticated: Falso (token expirado). Limpiando token.');
      this.removeToken();
      return false;
    }

    console.log('[api.js] isAuthenticated: Verdadero.');
    return true;
  }

  // Decodificar token JWT (básico)
  decodeToken() {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payload = token.split(".")[1];
      const decoded = JSON.parse(atob(payload));
      return decoded;
    } catch (error) {
      console.error("Error decodificando token:", error);
      return null;
    }
  }

  // Verificar si el token ha expirado
  isTokenExpired() {
    const decoded = this.decodeToken();
    if (!decoded) return true;

    const currentTime = Math.floor(Date.now() / 1000);
    return decoded.exp < currentTime;
  }
} // ✅ CIERRE CORRECTO DE LA CLASE ApiClient

// ============================================================================
// 🆕 FUNCIONES GLOBALES DE LOGOUT (FUERA DE LA CLASE)
// ============================================================================

// 🆕 LOGOUT SEGURO - REEMPLAZA LA FUNCIÓN INSEGURA ANTERIOR
async function logout(options = {}) {
  try {
    console.log("🔄 Iniciando logout seguro...");

    const result = await api.logout({
      redirectTo: options.redirectTo || "index.html",
      showNotification: options.showNotification !== false,
      logoutAll: options.logoutAll || false,
    });

    return result;
  } catch (error) {
    console.error("❌ Error en logout:", error);
    // Fallback: limpiar localmente y redirigir
    api.clearAllSessionData();
    window.location.href = "index.html";
  }
}

// 🆕 LOGOUT DE TODOS LOS DISPOSITIVOS
async function logoutAllDevices() {
  if (
    confirm(
      "¿Cerrar sesión en TODOS los dispositivos? Esta acción no se puede deshacer."
    )
  ) {
    return logout({ logoutAll: true });
  }
}

// 🆕 MANEJAR CLICK EN BOTÓN DE LOGOUT NORMAL
function handleLogoutClick() {
  if (confirm("¿Cerrar sesión en este dispositivo?")) {
    logout();
  }
}

// 🆕 MANEJAR CLICK EN BOTÓN DE LOGOUT GLOBAL
function handleLogoutAllClick() {
  if (
    confirm(
      "¿Cerrar sesión en TODOS los dispositivos?\n\nEsto invalidará todas las sesiones activas."
    )
  ) {
    logoutAllDevices();
  }
}

// 🆕 CONFIGURAR BOTONES DE LOGOUT EN EL DOM
function setupLogoutButtons() {
  // Buscar botones de logout en el DOM
  const logoutBtn =
    document.getElementById("logoutBtn") ||
    document.querySelector(".logout-btn") ||
    document.querySelector('[data-action="logout"]');

  const logoutAllBtn =
    document.getElementById("logoutAllBtn") ||
    document.querySelector('[data-action="logout-all"]');

  if (logoutBtn) {
    logoutBtn.addEventListener("click", handleLogoutClick);
    console.log("✅ Botón de logout configurado");
  }

  if (logoutAllBtn) {
    logoutAllBtn.addEventListener("click", handleLogoutAllClick);
    console.log("✅ Botón de logout global configurado");
  }
}

// ============================================================================
// 🚀 INICIALIZACIÓN ROBUSTA DE API
// ============================================================================

let api;

// Función para inicializar ApiClient
function initializeApiClient() {
  if (!api) {
    api = new ApiClient();
    console.log("✅ ApiClient inicializado correctamente");
  }
  return api;
}

// Inicializar inmediatamente
api = initializeApiClient();

// Hacer disponible globalmente
window.api = api;
window.ApiClient = ApiClient;
window.initializeApiClient = initializeApiClient;

// Hacer disponibles las funciones de logout globalmente
window.logout = logout;
window.logoutAllDevices = logoutAllDevices;
window.handleLogoutClick = handleLogoutClick;
window.handleLogoutAllClick = handleLogoutAllClick;
window.setupLogoutButtons = setupLogoutButtons;

// Verificar que esté disponible
if (typeof api === "undefined") {
  console.error("❌ CRÍTICO: api no se pudo inicializar");
} else {
  console.log("✅ api disponible globalmente:", typeof api);
}

// Configurar botones cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", setupLogoutButtons);

// Verificar que se inicializó correctamente
setTimeout(() => {
  if (typeof api !== "undefined" && api) {
    console.log("✅ API confirmada después de carga:", typeof api);
    console.log(
      "🔧 Métodos disponibles:",
      Object.getOwnPropertyNames(Object.getPrototypeOf(api))
    );
  } else {
    console.error("❌ API no disponible después de carga");
  }
}, 100);
