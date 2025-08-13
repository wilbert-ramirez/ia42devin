// Dashboard functionality

let currentUserData = null;
let userRoles = [];

async function verifyAuthenticationForDashboard() {
  console.log("🔒 Verificando autenticación para dashboard...");

  // Esperar a que api esté disponible
  function waitForApi() {
    return new Promise((resolve, reject) => {
      if (typeof api !== "undefined" && api) {
        resolve(api);
        return;
      }

      let attempts = 0;
      const maxAttempts = 50; // 5 segundos

      function checkApi() {
        attempts++;
        if (typeof api !== "undefined" && api) {
          resolve(api);
        } else if (attempts < maxAttempts) {
          setTimeout(checkApi, 100);
        } else {
          reject(new Error("API no disponible después de 5 segundos"));
        }
      }

      checkApi();
    });
  }

  try {
    await waitForApi();

    // Verificar autenticación
    if (!api.isAuthenticated() || api.isTokenExpired()) {
      console.warn(
        "⚠️ Usuario no autenticado en dashboard, redirigiendo a login..."
      );

      // Limpiar datos obsoletos
      api.clearAllSessionData();

      // Mostrar mensaje
      if (typeof showNotification === "function") {
        showNotification(
          "Tu sesión ha expirado. Por favor inicia sesión nuevamente.",
          "warning",
          3000
        );
      }

      // Redirigir al login
      setTimeout(() => {
        window.location.href = "login.html";
      }, 1500);

      return false;
    }

    console.log("✅ Usuario autenticado correctamente para dashboard");
    return true;
  } catch (error) {
    console.error("❌ Error verificando autenticación:", error);

    // En caso de error, redirigir al login por seguridad
    setTimeout(() => {
      window.location.href = "login.html";
    }, 2000);

    return false;
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  console.log("📄 Dashboard DOM cargado, verificando autenticación...");

  // Verificar autenticación primero
  const isAuthenticated = await verifyAuthenticationForDashboard();

  if (!isAuthenticated) {
    return; // No continuar si no está autenticado
  }

  // Si está autenticado, continuar con la inicialización normal
  try {
    await initializeDashboard();
    console.log("✅ Dashboard inicializado correctamente");
  } catch (error) {
    console.error("❌ Error inicializando dashboard:", error);
    if (typeof showNotification === "function") {
      showNotification(
        "Error cargando dashboard. Recarga la página.",
        "error",
        5000
      );
    }
  }

  const editProfileModal = document.getElementById("editProfileModal");
  const editProfileForm = document.getElementById("editProfileForm");
  const editSpinner = document.getElementById("editSpinner");
  const editProfileBtn = document.getElementById("editProfileBtn");
  const closeModalButtons = document.querySelectorAll(".close");
  const userAvatarInput = document.getElementById("editUserAvatar");
  const avatarPreview = document.getElementById("avatarImage");
  

  const api = window.api || new ApiClient();

  const showNotification = (message, type = "success", duration = 3000) => {
    const notification = document.getElementById("notification");
    const notificationText = document.getElementById("notificationText");
    notificationText.textContent = message;
    notification.className = `notification ${type}`;
    notification.style.display = "block";
    if (duration > 0) {
      setTimeout(() => {
        notification.style.display = "none";
      }, duration);
    }
  };

  // Preview avatar when file is selected
  userAvatarInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        avatarPreview.src = e.target.result;
        avatarPreview.style.display = "block";
      };
      reader.readAsDataURL(file);
    } else {
      avatarPreview.style.display = "none";
      avatarPreview.src = "";
    }
  });

  // Open modal and pre-fill form
  editProfileBtn.addEventListener("click", () => {
    editProfileModal.style.display = "block";
    api
      .getProfile()
      .then((response) => {
        if (response.success) {
          document.getElementById("editName").value = response.data.name || "";
          document.getElementById("editBirthdate").value =
            response.data.birthdate || "";
          if (response.data.userAvatar) {
            avatarPreview.src = response.data.userAvatar;
            avatarPreview.style.display = "block";
          } else {
            avatarPreview.style.display = "none";
            avatarPreview.src = "";
          }
        }
      })
      .catch((error) => {
        showNotification("Error cargando datos del perfil", "error");
      });
  });

  // Close modal
  closeModalButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const modalId = button.getAttribute("data-modal-id");
      document.getElementById(modalId).style.display = "none";
    });
  });

  window.addEventListener("click", (event) => {
    if (event.target.classList.contains("modal")) {
      event.target.style.display = "none";
    }
  });

 

  // Handle form submission with file upload
  editProfileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    editSpinner.style.display = "inline-block";

    const formData = new FormData();
    formData.append("name", document.getElementById("editName").value.trim());
    const birthdate = document.getElementById("editBirthdate").value;
    if (birthdate) formData.append("birthdate", birthdate);
    if (userAvatarInput.files[0])
      formData.append("userAvatar", userAvatarInput.files[0]);

    try {
      const response = await fetch(`${api.baseURL}/students/profile`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${api.getToken()}`,
        },
        body: formData,
      });
      const result = await response.json();

      if (response.ok && result.success) {
        showNotification("Perfil actualizado correctamente", "success");
        // Update UI
        document.getElementById("userName").textContent = result.data.name;
        if (result.data.userAvatar) {
          document.getElementById("userAvatar").innerHTML =
            `<img src="${result.data.userAvatar}" alt="User Avatar" style="width: 50px; height: 50px; border-radius: 50%;">`;
        }
        await initializeDashboard();
        setTimeout(() => {
          editProfileModal.style.display = "none";
        }, 1500);
      } else {
        throw new Error(result.error || "Error actualizando perfil");
      }
    } catch (error) {
      showNotification(`Error actualizando perfil: ${error.message}`, "error");
    } finally {
      editSpinner.style.display = "none";
    }
  });
});

// Inicializar dashboard
async function initializeDashboard() {
  // Verificar autenticación
  if (!api.isAuthenticated() || api.isTokenExpired()) {
    window.location.href = "index.html";
    return;
  }

  try {
    await loadDashboardData();
    setupEventListeners();
  } catch (error) {
    console.error("Error inicializando dashboard:", error);
    showNotification(
      "Error cargando el dashboard. Por favor recarga la página.",
      "error"
    );
  }
}

// Cargar todos los datos del dashboard
async function loadDashboardData() {
  try {
    // Cargar perfil del usuario
    await loadUserProfile();

    // Cargar cursos disponibles
    await loadCoursesData();

    // Cargar actividad del usuario
    await loadUserActivity();

    // Si es admin, cargar estadísticas administrativas
    if (hasRole(["admin", "superadmin"])) {
      await loadAdminStats();
    }
  } catch (error) {
    console.error("Error cargando datos:", error);
    throw error;
  }
}

// Cargar perfil del usuario
async function loadUserProfile() {
  try {
    const response = await api.getProfile();

    if (response.success) {
      currentUserData = response.data;
      updateUserInfo(currentUserData);
      updateProfileCard(currentUserData);
    }
  } catch (error) {
    console.error("Error cargando perfil:", error);
    showNotification("Error cargando perfil de usuario", "error");
  }
}

// Actualizar información del usuario en el header
function updateUserInfo(userData) {
  const userName = document.getElementById("userName");
  const userAvatar = document.getElementById("userAvatar");
  const userRoles = document.getElementById("userRoles");

  if (userName) {
    userName.textContent = userData.name || "Usuario";
  }
  if (userAvatar) {
    // Clear existing content
    userAvatar.innerHTML = "";
    // Display avatar image or default icon
    if (userData.useravatar) {
      const img = document.createElement("img");
      img.src = userData.useravatar;
      img.alt = "User Avatar";
      img.style.width = "50px";
      img.style.height = "50px";
      img.style.borderRadius = "50%";
      img.style.objectFit = "cover";
      img.onerror = () => {
        // Fallback to default icon if image fails to load
        userAvatar.innerHTML = '<i class="fas fa-user"></i>';
      };
      userAvatar.appendChild(img);
    } else {
      userAvatar.innerHTML = '<i class="fas fa-user"></i>';
    }
  }

  // Obtener roles del token JWT
  const tokenData = api.decodeToken();
  if (tokenData) {
    // Simular roles basados en el usuario (esto normalmente vendría del backend)
    const roles = getUserRoles(userData);
    updateRolesDisplay(roles);

    // Mostrar botones según roles
    updateUIBasedOnRoles(roles);
  }
}

// Obtener roles del usuario (simulado)
function getUserRoles(userData) {
  // En una implementación real, esto vendría del backend
  // Por ahora simulamos basándose en el email
  const roles = ["student"]; // Rol base

  if (userData.email === "admin@ia42.com") {
    roles.push("superadmin");
  } else if (userData.email === "juan@test.com") {
    roles.push("admin");
  }

  return roles;
}

// Actualizar display de roles
function updateRolesDisplay(roles) {
  const userRolesElement = document.getElementById("userRoles");
  userRoles = roles;
}

// Obtener nombre de display del rol
function getRoleDisplayName(role) {
  const roleNames = {
    student: "Estudiante",
    admin: "Administrador",
    superadmin: "Super Admin",
    instructor: "Instructor",
    support: "Soporte",
  };
  return roleNames[role] || role;
}

// Actualizar UI basado en roles
function updateUIBasedOnRoles(roles) {
  const adminBtn = document.getElementById("adminBtn");
  const adminCard = document.getElementById("adminCard");

  if (hasRole(["admin", "superadmin"])) {
    if (adminBtn) adminBtn.style.display = "inline-flex";
    if (adminCard) adminCard.style.display = "block";
  }
}

// Verificar si el usuario tiene alguno de los roles especificados
function hasRole(rolesToCheck) {
  return rolesToCheck.some((role) => userRoles.includes(role));
}

// Actualizar tarjeta de perfil
function updateProfileCard(userData) {
  const profileInfo = document.getElementById("profileInfo");

  if (profileInfo) {
    profileInfo.innerHTML = `
            <div class="info-row">
                <span class="info-label">Email:</span>
                <span class="info-value">${userData.email}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Estado:</span>
                <span class="info-value">${getStatusDisplayName(userData.status)}</span>
            </div>
            <div class="info-row">
                <span class="info-label">Fecha de Nacimiento:</span>
                <span class="info-value">${userData.birthdate ? formatDate(userData.birthdate) : "No especificada"}</span>
            </div>
            
            <div class="info-row">
                <span class="info-label">Miembro desde:</span>
                <span class="info-value">${formatDate(userData.signupdate)}</span>
            </div>
        `;
  }
}

// Obtener nombre de display del estado
function getStatusDisplayName(status) {
  const statusNames = {
    Active: "Activo",
    "Pending Confirmation": "Pendiente de Confirmación",
    Suspended: "Suspendido",
    Inactive: "Inactivo",
  };
  return statusNames[status] || status;
}

function goToCourses() {
  window.location.href = "lx-student.html";
}


function goToAllCourses() {
  window.location.href = "lx-home.html";
}

// Cargar datos de cursos
async function loadCoursesData() {
  try {
    const response = await fetch(`${API_BASE_URL}/courses/subscriptions`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${api.getToken()}`,
      },
    });

    if (response.ok) {
      // Parse the response body as JSON
      const data = await response.json();

      // Update total courses count
      const coursesCount = document.getElementById("coursesCount");
      if (coursesCount) {
        coursesCount.textContent = data.count || 0;
      }

      // Update active subscriptions count
      const activeCount = document.getElementById("activeCount");
      if (activeCount) {
        activeCount.textContent = data.active_count || 0;
      }

      // Update completed subscriptions count
      const completedCount = document.getElementById("completedCount");
      if (completedCount) {
        completedCount.textContent = data.completed_count || 0;
      }

      // Update expired subscriptions count
      const expiredCount = document.getElementById("expiredCount");
      if (expiredCount) {
        expiredCount.textContent = data.expired_count || 0;
      }

      // Optional: Process the data array to render subscription details
      // Example: renderSubscriptions(data.data);
    } else {
      console.error("Error: Response not OK", response.status);
    }
  } catch (error) {
    console.error("Error cargando cursos:", error);
  }

  // Add event listener for the courses link
  document.addEventListener("click", function (event) {
  if (event.target.matches(".courses-link-all")) {
    event.preventDefault();
    goToAllCourses();
  }
});


  
}

// Cargar actividad del usuario
async function loadUserActivity() {
  try {
    const response = await api.getActivity();

    if (response.success) {
      updateActivityList(response.data);
    }
  } catch (error) {
    console.error("Error cargando actividad:", error);
    const activityList = document.getElementById("activityList");
    if (activityList) {
      activityList.innerHTML =
        '<p class="text-center">No se pudo cargar la actividad</p>';
    }
  }
}

// Actualizar lista de actividad
function updateActivityList(activities) {
  const activityList = document.getElementById("activityList");

  if (!activityList) return;

  if (!activities || activities.length === 0) {
    activityList.innerHTML =
      '<p class="text-center">No hay actividad reciente</p>';
    return;
  }

  const activitiesHTML = activities
    .slice(0, 5)
    .map((activity) => {
      const messageData =
        typeof activity.message === "string"
          ? JSON.parse(activity.message)
          : activity.message;

      return `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="${getActivityIcon(messageData.action)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-title">${getActivityTitle(messageData.action)}</div>
                    <div class="activity-time">${formatRelativeTime(messageData.timestamp || messageData.logdate)}</div>
                </div>
            </div>
        `;
    })
    .join("");

  activityList.innerHTML = activitiesHTML;
}

// Obtener icono de actividad
function getActivityIcon(action) {
  const icons = {
    user_registered: "fas fa-user-plus",
    email_confirmed: "fas fa-envelope-check",
    password_reset_requested: "fas fa-key",
    password_reset_completed: "fas fa-lock",
    profile_updated: "fas fa-edit",
    login: "fas fa-sign-in-alt",
  };
  return icons[action] || "fas fa-info-circle";
}

// Obtener título de actividad
function getActivityTitle(action) {
  const titles = {
    user_registered: "Cuenta creada",
    email_confirmed: "Email confirmado",
    password_reset_requested: "Recuperación de contraseña solicitada",
    password_reset_completed: "Contraseña restablecida",
    profile_updated: "Perfil actualizado",
    login: "Inicio de sesión",
  };
  return titles[action] || "Actividad";
}

// Formatear tiempo relativo
function formatRelativeTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Hace un momento";
  if (diffMins < 60) return `Hace ${diffMins} minutos`;
  if (diffHours < 24) return `Hace ${diffHours} horas`;
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays} días`;

  return formatDate(dateString);
}

// Cargar estadísticas de administración
async function loadAdminStats() {
  try {
    const response = await api.getAdminDashboard();

    if (response.success) {
      updateAdminStats(response.data.statistics);
    }
  } catch (error) {
    console.error("Error cargando estadísticas admin:", error);
    const adminStats = document.getElementById("adminStats");
    if (adminStats) {
      adminStats.innerHTML = "<p>Error cargando estadísticas</p>";
    }
  }
}

// Actualizar estadísticas de admin
function updateAdminStats(stats) {
  const adminStats = document.getElementById("adminStats");

  if (adminStats && stats) {
    adminStats.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                <div>
                    <div class="stat-number" style="font-size: 1.5rem;">${stats.total_users || 0}</div>
                    <div class="stat-label">Usuarios</div>
                </div>
                <div>
                    <div class="stat-number" style="font-size: 1.5rem;">${stats.active_students || 0}</div>
                    <div class="stat-label">Estudiantes Activos</div>
                </div>
                <div>
                    <div class="stat-number" style="font-size: 1.5rem;">${stats.active_courses || 0}</div>
                    <div class="stat-label">Cursos</div>
                </div>
                <div>
                    <div class="stat-number" style="font-size: 1.5rem;">${stats.new_users_month || 0}</div>
                    <div class="stat-label">Nuevos este mes</div>
                </div>
            </div>
            <button class="btn btn-primary" onclick="openAdminPanel()" style="margin-top: 1rem; width: 100%;">
                <i class="fas fa-cogs"></i> Ver Panel Completo
            </button>
        `;
  }
}

// Event listeners
function setupEventListeners() {
  const editProfileForm = document.getElementById("editProfileForm");
  if (editProfileForm) {
    editProfileForm.addEventListener("submit", handleEditProfile);
  }
}

// Funciones de navegación
function editProfile() {
  if (currentUserData) {
    // Prellenar formulario
    document.getElementById("editName").value = currentUserData.name || "";
    document.getElementById("editBirthdate").value =
      currentUserData.birthdate || "";
    showModal("editProfileModal");
  }
}

function viewCourses() {
  // Navegar a página de cursos (por implementar)
  showNotification("Página de cursos en desarrollo", "warning");
}

function openAdminPanel() {
  if (hasRole(["admin", "superadmin"])) {
    // Navegar a panel de admin (por implementar)
    showNotification("Panel de administración en desarrollo", "warning");
  } else {
    showNotification(
      "No tienes permisos para acceder al panel de administración",
      "error"
    );
  }
}

// Manejar edición de perfil
async function handleEditProfile(event) {
  event.preventDefault();

  const name = document.getElementById("editName").value;
  const birthdate = document.getElementById("editBirthdate").value;
  const spinner = document.getElementById("editSpinner");

  showSpinner(spinner);

  try {
    const updateData = {};
    if (name !== currentUserData.name) updateData.name = name;
    if (birthdate !== currentUserData.birthdate)
      updateData.birthdate = birthdate;

    if (Object.keys(updateData).length === 0) {
      showNotification("No hay cambios para guardar", "warning");
      return;
    }

    const response = await api.updateProfile(updateData);

    if (response.success) {
      showNotification("Perfil actualizado exitosamente", "success");
      closeModal("editProfileModal");

      // Recargar datos del perfil
      await loadUserProfile();
    }
  } catch (error) {
    showNotification("Error actualizando perfil: " + error.message, "error");
  } finally {
    hideSpinner(spinner);
  }
}
