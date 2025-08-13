 const urlParams = new URLSearchParams(window.location.search);
    const cursoId = urlParams.get("curso");

    if (!cursoId) {
      document.getElementById("payment-message").innerHTML =
        '<div class="alert-danger">Curso no especificado.</div>';
      throw new Error("ID del curso no encontrado");
    }

    async function initialize() {
      if (typeof OnvoPay === "undefined") {
        showMessage("Error al cargar ONVO Pay. Verifica conexión.", "danger");
        return;
      }

      const token = localStorage.getItem("token");
      if (!token) {
        showMessage("Debes iniciar sesión para pagar.", "danger");
        return;
      }

      try {
        // Obtener perfil del estudiante
        const profileRes = await fetch(`${API_BASE_URL}/students/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        const profileData = await profileRes.json();
        const id_student = profileData.data?.id_student || profileData.data?.student?.id_student;
        if (!id_student) throw new Error("ID estudiante no encontrado");

        // Obtener detalles del curso
        const courseRes = await fetch(`${API_BASE_URL}/payments/course-details?cursoId=${cursoId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        

        const { courseName, price } = await courseRes.json();
        document.getElementById("course-name").textContent = courseName || "Curso";
        document.getElementById("course-price").textContent = price || "0";
        document.getElementById("confirmation-card").style.display = "block";

        const onvoPay = OnvoPay({
          publishableKey: "onvo_test_publishable_key_kzOkpVEfSmImyAv4xr-vHx-xRpA5flmHqVygpk3V8CQ6QAFJKoOMc5aCOOFCwGtdtVsmS04V7gqp9zOYwyMIGQ",
        });

        document.getElementById("confirm-pay").addEventListener("click", async () => {
          document.getElementById("confirm-pay").disabled = true;
          try {
            const intentRes = await fetch(`${API_BASE_URL}/payments/create-onvo-payment-intent`, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                cursoId,
                studentId: id_student,
                amount: price,
                currency: "USD",
                description: `Pago por curso ID ${cursoId}`,
              }),
            });

            const { clientSecret } = await intentRes.json();

            onvoPay
              .payment({
                clientSecret,
              })
              .render("#onvo-pay-button-container")
              .then(async (result) => {
                if (result.error) {
                  showMessage(`Error en pago: ${result.error.message}`, "danger");
                  return;
                }

                const captureRes = await fetch(`${API_BASE_URL}/payments/capture-onvo-payment`, {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    paymentIntentId: result.paymentIntent.id,
                    cursoId,
                    studentId: id_student,
                  }),
                });

                const captureData = await captureRes.json();
                if (captureData.status === "succeeded") {
                  showMessage("¡Pago realizado con éxito!", "success");
                  setTimeout(() => {
                    window.location.href = `/curso.html?id=${cursoId}&pagado=true`;
                  }, 1500);
                } else {
                  showMessage("Pago no completado.", "danger");
                }
              });

            document.getElementById("confirmation-card").style.display = "none";
            document.getElementById("onvo-pay-button-container").style.display = "block";
          } catch (err) {
            showMessage("Error durante el proceso de pago.", "danger");
            console.error(err);
          } finally {
            document.getElementById("confirm-pay").disabled = false;
          }
        });
      } catch (err) {
        showMessage(`Error al cargar datos: ${err.message}`, "danger");
      }
    }

    function waitForSDK() {
      if (typeof OnvoPay !== "undefined") {
        initialize();
      } else {
        setTimeout(waitForSDK, 100);
      }
    }

    document.addEventListener("DOMContentLoaded", () => {
      waitForSDK();
    });

    function showMessage(message, type = "success") {
      const msg = document.getElementById("payment-message");
      msg.innerHTML = `<div class="alert-${type}">${message}</div>`;
    }