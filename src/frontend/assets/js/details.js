const urlParams = new URLSearchParams(window.location.search);
const cursoId = urlParams.get("id"); // Changed from 'id' to 'curso'

if (!cursoId) {
  document.getElementById("course-message").innerHTML =
    '<div class="alert-danger">Curso no especificado.</div>';
  throw new Error("ID del curso no encontrado");
}

async function initialize() {
  try {
    const token = localStorage.getItem("token");
    const payNowButton = document.getElementById("pay-now");

    if (!cursoId) {
      showMessage("ID del curso no encontrado", "danger");
      payNowButton.style.display = "none";
      return;
    }

    /*if (!token) {
      showMessage(
        "Debes iniciar sesión para ver los detalles del curso.",
        "danger"
      );
      payNowButton.style.display = "none";
      return;
    }*/

    // Obtener detalles del curso
    const response = await fetch(
      `${API_BASE_URL}/courses/details?cursoId=${cursoId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Error al obtener detalles del curso: ${errorData.error || response.statusText} ${errorData.details || ""}`
      );
    }

    const {
      courseName,
      price,
      description,
      imagePath,
      technicalDesc,
      commercialDesc,

    } = await response.json();

    document.getElementById("course-name").textContent =
      courseName || "Curso desconocido";
    document.getElementById("course-price").textContent = price || "N/A";
    document.getElementById("course-technical-desc").textContent =
      technicalDesc || "Sin descripción técnica";
    document.getElementById("course-commercial-desc").textContent =
      commercialDesc || "Sin descripción comercial";
    
    if (imagePath) {
      document.getElementById("course-image").src = imagePath;
      document.getElementById("course-image").style.display = "block";
    }

    if (token) {
        
    
    // Verificar suscripción
    const subRes = await fetch(
      `${API_BASE_URL}/courses/suscription/${cursoId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!subRes.ok) throw new Error("Error al verificar suscripción");
    const subData = await subRes.json();

    if (subData?.active) {
      // Usuario ya está suscrito → Mostrar botón "Continuar"
      const continueLink = `lx.html?id=${cursoId}`;
      payNowButton.className = "btn btn-primary";
      payNowButton.innerHTML = '<i class="fas fa-play"></i> Continuar';
      payNowButton.href = continueLink;
      payNowButton.style.display = "inline-block";

      payNowButton.addEventListener("click", (event) => {
        console.log("Continuar clicked, navigating to:", continueLink);
        // Redirección manual si lo deseas
        // event.preventDefault();
        window.location.href = continueLink;
      });
    } else {
      // Usuario no está suscrito → Mostrar botón "Pagar Ahora"
      const payNowLink = `payment.html?curso=${cursoId}`;
      payNowButton.className = "btn btn-primary";
      payNowButton.innerHTML = '<i class="fas fa-dollar-sign"></i> Suscribirse​';
      payNowButton.href = payNowLink;
      payNowButton.style.display = "inline-block";

      payNowButton.addEventListener("click", (event) => {
        console.log("Pay now clicked, navigating to:", payNowLink);
        // Redirección manual si lo deseas
        // event.preventDefault();
        window.location.href = payNowLink;
      });
    }
}
else{
    // Usuario no está suscrito → Mostrar botón "Pagar Ahora"
      const payNowLink = `register.html`;
      payNowButton.className = "btn btn-primary";
      payNowButton.innerHTML = '<i class="fas fa-dollar-sign"></i> Suscribirse​';
      payNowButton.href = payNowLink;
      payNowButton.style.display = "inline-block";

      payNowButton.addEventListener("click", (event) => {
        console.log("Pay now clicked, navigating to:", payNowLink);
        // Redirección manual si lo deseas
        // event.preventDefault();
        window.location.href = payNowLink;
      });
}
  } catch (error) {
    console.error("Error en initialize:", error);
    showMessage(
      `Error al cargar los detalles del curso: ${error.message}`,
      "danger"
    );
    document.getElementById("pay-now").style.display = "none";
  }
}

document.addEventListener("DOMContentLoaded", () => {
  console.log("DOMContentLoaded fired");
  initialize();
});

function showMessage(message, type = "success") {
  const messageDiv = document.getElementById("course-message");
  messageDiv.innerHTML = `<div class="alert-${type}">${message}</div>`;
}
