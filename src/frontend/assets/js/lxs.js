async function fetchCourses() {
  const coursesContainer = document.getElementById("courses-container");
  const loading = document.getElementById("loading");
  const error = document.getElementById("error");

  try {
    const response = await fetch(`${API_BASE_URL}/courses/lx-home`);
    if (!response.ok) throw new Error("Error al cargar los cursos");
    const courses = await response.json();

    loading.style.display = "none";

    if (!Array.isArray(courses.data)) {
      throw new Error("La respuesta de la API no es una lista de cursos");
    }

    coursesContainer.innerHTML = "";

    courses.data.forEach((course) => {
      const card = document.createElement("div");
      card.className = "course-card";

      const image = document.createElement("img");
      image.className = "course-image";
      image.src = course.imagepath || "https://placehold.co/250x150";
      image.alt = course.shortname || "Curso sin nombre";

      const content = document.createElement("div");
      content.className = "course-content";

      const title = document.createElement("h2");
      title.className = "course-title";
      title.textContent = course.shortname || "Sin título";

      const desc = document.createElement("p");
      desc.className = "course-desc";
      desc.textContent = course.commercial_desc || "Sin descripción disponible";

      const price = document.createElement("p");
      price.className = "course-price";
      price.textContent = course.price
        ? `$${course.price}`
        : "Precio no disponible";

      const actionsContainer = document.createElement("div");
      actionsContainer.className = "actionsContainer";

      const detailsButton = document.createElement("button");
      detailsButton.className = "btn btn-outline-dark";
      detailsButton.textContent = "Ver Detalles";
      detailsButton.onclick = () => {
        window.location.href = `lx-details.html?id=${course.id}`;
      };

      const actionButton = document.createElement("button");
      actionButton.className = "btn btn-primary";
      const token = localStorage.getItem("token");

      if (!token) {
        actionButton.innerHTML = '<i class="fas fa-play"></i> Suscribirse';
        actionButton.onclick = () => {
          window.location.href = "register.html";
        };
      } else {
        actionButton.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Cargando...';
        actionButton.disabled = true;

        fetch(`${API_BASE_URL}/courses/suscription/${course.id}`, {
          method: "GET",
          headers: {
            authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        })
          .then((res) => {
            if (!res.ok)
              throw new Error(`Error ${res.status}: ${res.statusText}`);
            return res.json();
          })
          .then((data) => {
            
            actionButton.disabled = false;
            const isSubscribed = data?.active;
            const status_sub = data?.data?.status;
            const validthru = data?.data?.validthru;

            if (isSubscribed) {
              price.style.display = "none";
              const fechaExpirada = new Date(validthru) < new Date();

              if (status_sub === 'completed' || fechaExpirada) {
                actionButton.innerHTML = '<i class="fas fa-play"></i> Opinar';
                actionButton.onclick = () => {
                window.location.href = `lx.html?id=${course.id}&opinar=1`;
              };
              } else {
                actionButton.innerHTML = '<i class="fas fa-play"></i> Continuar';
                actionButton.onclick = () => {
                window.location.href = `lx.html?id=${course.id}`;
              };
              }
              
              
              
              const progressBarContainer = document.createElement("div");
              progressBarContainer.style.width = "100%";
              progressBarContainer.style.marginBottom = "0.5rem";

              const progressText = document.createElement("small");
              if (fechaExpirada) {
                progressText.textContent = `La Fecha está expirada`;
              }else if (status_sub === 'completed') {
                progressText.textContent = `LX está Completada`;
              }else {
              progressText.textContent = `Progreso: ${
                data.data?.currentprogress || 0
              }%`;
            }
              progressText.style.display = "flex";
              progressText.style.justifyContent = "space-between";

              const progress = document.createElement("div");
              progress.style.background = "#e0e0e0";
              progress.style.borderRadius = "6px";
              progress.style.overflow = "hidden";
              progress.style.height = "10px";

              const progressInner = document.createElement("div");
              progressInner.style.background = "#ff9800";
              progressInner.style.height = "10px";
              progressInner.style.width = `${data.data?.currentprogress || 0}%`;

              progress.appendChild(progressInner);
              progressBarContainer.appendChild(progressText);
              progressBarContainer.appendChild(progress);
              content.insertBefore(progressBarContainer, content.children[3]);
            } else {
              actionButton.innerHTML =
                '<i class="fas fa-dollar-sign"></i> Suscribirse';
              actionButton.onclick = () => {
                window.location.href = `payment.html?curso=${course.id}`;
              };
            }
          })
          .catch((err) => {
            actionButton.disabled = false;
            actionButton.innerHTML =
              '<i class="fas fa-dollar-sign"></i> Suscribirse';
            actionButton.onclick = () => {
              window.location.href = `payment.html?curso=${course.id}`;
            };
            console.error("Error:", err);
          });
      }

      actionsContainer.appendChild(detailsButton);
      actionsContainer.appendChild(actionButton);

      content.appendChild(title);
      content.appendChild(desc);
      content.appendChild(price);
      content.appendChild(actionsContainer);

      card.appendChild(image);
      card.appendChild(content);
      coursesContainer.appendChild(card);
    });

     const btndashboardLink = nav.querySelector(".link-lxs");
  const currentPath = window.location.pathname;
  if (
    (
      currentPath.endsWith("/app/lx-home.html") ||
      currentPath.endsWith("lx-home.html")
    )
  ) {
    
    
    if (btndashboardLink) {
          btndashboardLink.style.display = "none";
        } 
  }
  else{
    if (btndashboardLink) {
          btndashboardLink.style.display = "block";
        } 
  }
  } catch (err) {
    loading.style.display = "none";
    error.style.display = "block";
    error.textContent = err.message || "Error desconocido al cargar los cursos";
    console.error("Error:", err);
  }
}

document.addEventListener("DOMContentLoaded", fetchCourses);
