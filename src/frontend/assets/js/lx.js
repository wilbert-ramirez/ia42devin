const DEFAULT_N8N_WEBHOOK_URL = "https://n8n.ia42.com/webhook/ia42Cloud-dev";

const chatContainer = document.getElementById("chat-container");
const chatMessages = document.getElementById("chat-messages");
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const restartButton = document.getElementById("restart-button");
const feedbackButton = document.getElementById("feedback-button");
const settingsButton = document.getElementById("settings-button");
const backButton = document.getElementById("back-button");
const experienceTitle = document.getElementById("experience-title");
const errorMessage = document.getElementById("error-message");
const loadingContainer = document.getElementById("loading-container");
const startButton = document.getElementById("start-button");
const doneButton = document.getElementById("done-button");
const evaluateButton = document.getElementById("evaluate-button");
const clarifyButton = document.getElementById("clarify-button");

let messages = [];
let isSending = false;
let sessionStarted = false;
let user = null;
let experience = null;
let promptDetails = null;
let evaluateCount = 0;
let sessionId = null;
let pregunta = 0;
let primeravez = 0;

const urlParams = new URLSearchParams(window.location.search);
const lxId = urlParams.get("id");
const opinar = urlParams.get("opinar");

if (opinar === "1" || opinar === 1) {
  const botones = [
    "restart-button",
    "settings-button",
    "evaluate-button",
    "done-button",
    "clarify-button",
    "start-button",
    "send-button"
  ];

  botones.forEach(id => {
    const boton = document.getElementById(id);
    if (boton) {
      boton.disabled = true;
    }
  });
}

function getIconByType(type) {
  switch (type) {
    case "success": return "fa-check-circle";
    case "destructive": return "fa-exclamation-circle";
    default: return "fa-info-circle";
  }
}

window.notify = function (message, type = "success") {
  const container = document.getElementById("notificationContainer");
  if (!container) return;

  const notif = document.createElement("div");
  notif.classList.add("notification-box", type);
  notif.innerHTML = `
    <i class="fas ${getIconByType(type)}"></i>
    <span>${message}</span>
  `;

  container.appendChild(notif);

  setTimeout(() => {
    notif.remove();
  }, 3600);
};

function scrollToBottom() {
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function showError(message) {
  loadingContainer.style.display = "none";
  errorMessage.textContent = message;
  errorMessage.style.display = "block";
  chatContainer.style.display = "none";
}

function addMessage(sender, text, base64Image = null, thinking = false) {
  const message = document.createElement("div");
  message.className = `message ${sender}`;
  const content = document.createElement("div");
  content.className = "message-content";

  if (thinking) {
    content.className += " thinking";
    content.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Pensando...`;
  } else {
    content.innerHTML = text;
    if (base64Image) {
      const img = document.createElement("img");
      img.src = `data:image/png;base64,${base64Image}`;
      img.alt = "Imagen generada por IA";
      content.appendChild(document.createElement("div")).appendChild(img);
    }
  }

  message.appendChild(content);
  message.appendChild(document.createElement("i")).className =
    sender === "user" ? "fas fa-user" : "fas fa-robot";

  chatMessages.appendChild(message);
  messages.push({ id: Date.now(), sender, text, base64Image, thinking });
  scrollToBottom();
}

function generateSessionId() {
  if (sessionId) return sessionId;
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  sessionId = `${user?.data.id_student}_${lxId}_session-${timestamp}-${randomStr}`;
  localStorage.setItem(`session_${lxId}`, sessionId);
  return sessionId;
}

function constructPayload(messageText, action = null) {
  const payload = {
    user_message: messageText || "",
    system_prompt: experience.shortname,
    temperature: promptDetails?.temperature || 0.7,
    max_tokens: promptDetails?.max_tokens || 1500,
    language: localStorage.getItem("language") || "es",
    prompt_config: promptDetails?.prompt_config || null,
    id_prompt: promptDetails?.id_prompt || 1,
    user_id: user?.data.id_student || null,
    session_id: generateSessionId(),
    action: action || null,
    experience_id: lxId,
    evaluate_count: evaluateCount
  };
  return payload;
}

async function processWebhookResponse(response) {
  let agentText = "No se pudo obtener una respuesta del agente.";
  let agentImage = null;
  let action = null;

  if (response) {
    const responseData = Array.isArray(response) && response.length > 0 ? response[0] : response;
    agentText = responseData.output.replace(/{{.*?}}/g, "") || responseData.reply || agentText;
    agentImage = responseData.base64Image || null;
    action = responseData.action || null;
  }

  messages = messages.filter((m) => m.id !== "thinking");
  addMessage("agent", agentText, agentImage);

  if (action === "session_started" && !sessionStarted) {
    sessionStarted = true;
    window.notify("Sesión iniciada: Enviando mensaje de continuación...", "success");
    setTimeout(async () => {
      addMessage("agent", "Pensando...", null, true);
      await sendToWebhook(constructPayload("¡Empecemos!", "continue"), false);
    }, 1000);
  }
}

async function sendToWebhook(payload, addUserMessage = true) {
  if (addUserMessage) {
    addMessage("user", payload.user_message);
    messageInput.value = "";
  }

  isSending = true;
  startButton.disabled = true;
  doneButton.disabled = true;
  evaluateButton.disabled = true;
  clarifyButton.disabled = true;
  sendButton.disabled = true;

  const webhookUrl = experience?.wf_hookup?.trim() || DEFAULT_N8N_WEBHOOK_URL;

  if (!webhookUrl || webhookUrl.includes("YOUR_N8N_WEBHOOK_URL_PLACEHOLDER")) {
    window.notify("Webhook no configurado: Mostrando respuesta simulada.", "default");
    setTimeout(() => {
      messages = messages.filter((m) => m.id !== "thinking");
      addMessage("agent", "Respuesta simulada: Webhook no configurado.");
      isSending = false;
      startButton.disabled = false;
      doneButton.disabled = false;
      evaluateButton.disabled = false;
      clarifyButton.disabled = false;
      sendButton.disabled = !messageInput.value.trim();
    }, 1500);
    return;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    await processWebhookResponse(data);
  } catch (err) {
    console.error("Error sending message to webhook:", err);
    window.notify(`Error de Comunicación: ${err.message}`, "destructive");
    messages = messages.filter((m) => m.id !== "thinking");
    addMessage("agent", `Lo siento, tuve problemas: ${err.message}`);
  } finally {
    isSending = false;
    startButton.disabled = false;
    doneButton.disabled = false;
    evaluateButton.disabled = false;
    clarifyButton.disabled = false;
    sendButton.disabled = !messageInput.value.trim();
  }
}

function resetInteraction() {
  messages = [];
  chatMessages.innerHTML = "";
  sessionStarted = false;
  evaluateCount = 0;
  messageInput.disabled = true;
  sendButton.disabled = true;
  startButton.style.display = "block";
  clarifyButton.style.display = "block";
  doneButton.style.display = "none";
  evaluateButton.style.display = "none";
  pregunta = 0;
  primeravez = 0;

  if (experience && user) {
    let initialMessage;
    if (!opinar) {
      initialMessage = `¡Hola ${user?.data.name || "estudiante"}! Bienvenido de nuevo a "${experience.shortname}". <a href="#" id="link-iniciar" style="color: #007bff; text-decoration: underline;">¿Listo para empezar?</a>`;
    } else {
      initialMessage = `¡Hola ${user?.data.name || "estudiante"}! Bienvenido de nuevo a "${experience.shortname}". Solamente puedes opinar`;
    }
    
    addMessage("agent", initialMessage);
    setTimeout(() => {
      const linkIniciar = document.getElementById("link-iniciar");
      if (linkIniciar) {
        linkIniciar.addEventListener("click", (e) => {
          e.preventDefault();
          startInteraction();
        });
      }
    }, 100);
  }

  window.notify("Interacción Reiniciada: La conversación ha sido reiniciada.", "success");
}

async function submitFeedback() {
  const modal = document.getElementById("feedback-modal");
  const form = document.getElementById("feedback-form");
  const cancelButton = document.getElementById("cancel-feedback");
  const feedbackText = document.getElementById("feedback-text");

  if (!modal) {
    window.notify("Error: No se pudo abrir el modal de feedback.", "destructive");
    return;
  }

  modal.style.display = "flex";
  form.reset();

  cancelButton.onclick = () => {
    modal.style.display = "none";
    window.notify("Feedback Cancelado: No se envió ninguna opinión.", "destructive");
  };

  form.onsubmit = async (e) => {
    e.preventDefault();
    const stars = form.querySelector('input[name="stars"]:checked')?.value;
    const text = feedbackText.value.trim();

    if (!stars) return window.notify("Por favor, selecciona una calificación.", "destructive");
    if (!text || text.length < 10) return window.notify("Comentario muy corto.", "destructive");

    const payload = {
      id_student: user?.data.id_student || null,
      stars: parseInt(stars),
      text,
      id_lx: lxId,
      status: "active",
    };

    try {
      const response = await fetch(`${API_BASE_URL}/courses/opinions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${api.getToken()}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("No se pudo enviar el feedback.");

      await response.json();
      modal.style.display = "none";
      window.notify("Feedback Enviado: Gracias por tu opinión.", "success");
    } catch (err) {
      console.error("Error enviando feedback:", err);
      window.notify(`Error: ${err.message}`, "destructive");
    }
  };
}

function toggleSettings() {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  localStorage.setItem("darkMode", isDark);
  window.notify(`Modo ${isDark ? "oscuro" : "claro"} activado.`, "success");
}

async function loadInitialData() {
  if (!api.isAuthenticated() || api.isTokenExpired()) {
    window.notify("Usuario no autenticado.", "destructive");
    window.location.href = "login.html";
    return;
  }

  loadingContainer.style.display = "block";
  errorMessage.style.display = "none";
  chatContainer.style.display = "none";

  try {
    const lxData = await fetch(`${API_BASE_URL}/courses/lx/${lxId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${api.getToken()}`,
      },
    });

    if (!lxData.ok) throw new Error("No se pudo cargar la experiencia.");
    const data = await lxData.json();
    experience = data.data;

    experienceTitle.textContent = experience.shortname || "Interacción IA";
    backButton.href = `lx-student.html`;

    if (experience.id_lx_prompt) {
      const promptAll = await fetch(`${API_BASE_URL}/courses/lxprompt/${experience.id_lx_prompt}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${api.getToken()}`,
        },
      });

      if (!promptAll.ok) throw new Error("No se pudo cargar los detalles del prompt.");
      const promptdata = await promptAll.json();
      promptDetails = promptdata.data;
    }

    user = await api.getProfile();
    resetInteraction();

    // Open feedback modal and disable    	    
    if (opinar === "1" || opinar === 1) {
      messageInput.disabled = true;
      submitFeedback();
    }

    loadingContainer.style.display = "none";
    chatContainer.style.display = "flex";
  } catch (err) {
    console.error("Error al cargar datos:", err);
    showError(err.message || "No se pudo cargar la información.");
    window.notify(`Error de Carga: ${err.message}`, "destructive");
  }
}

function startInteraction() {
  if (isSending) return;
  startButton.style.display = "none";
  clarifyButton.style.display = "none";
  doneButton.style.display = "block";
  evaluateButton.style.display = "block";
  messageInput.disabled = false;
  sendButton.disabled = !messageInput.value.trim();
  pregunta = 0;
  sendToWebhook(constructPayload("", "start"), false);
}

function clarifyInteraction() {
  if (isSending) return;
  messageInput.disabled = false;
  sendButton.disabled = !messageInput.value.trim();
  pregunta = 1;
  window.notify("¡Listo! Ahora puedes escribir tu duda.", "success");
}

async function doneInteraction() {
  if (isSending) return;
  await sendToWebhook(constructPayload("", "end"), false);
  messageInput.disabled = true;
  sendButton.disabled = true;
  doneButton.style.display = "none";
  evaluateButton.style.display = "none";
  startButton.style.display = "block";
  clarifyButton.style.display = "block";
  pregunta = 0;
  primeravez = 0;
  window.notify("Sesión finalizada.", "success");
}

async function evaluateProgress() {
  if (isSending) return;
  evaluateCount++;
  await sendToWebhook(constructPayload("", "evaluate"), false);
  window.notify("Progreso evaluado.", "success");
}

// Event listeners
sendButton.addEventListener("click", () => {
  if (!messageInput.value.trim() || isSending) return;
  if (pregunta == 1) {
    sendToWebhook(constructPayload(messageInput.value, "q&a"));
  } else {
    if (primeravez == 0) {
      sendToWebhook(constructPayload(messageInput.value, "choose_skill"));
      primeravez = 1;
    } else {
      sendToWebhook(constructPayload(messageInput.value, "chat"));
    }
  }
});

messageInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!messageInput.value.trim() || isSending) return;
    if (pregunta == 1) {
      sendToWebhook(constructPayload(messageInput.value, "q&a"));
    } else {
      if (primeravez == 0) {
        sendToWebhook(constructPayload(messageInput.value, "choose_skill"));
        primeravez = 1;
      } else {
        sendToWebhook(constructPayload(messageInput.value, "chat"));
      }
    }
  }
});

messageInput.addEventListener("input", () => {
  sendButton.disabled = !messageInput.value.trim() || isSending;
});

startButton.addEventListener("click", startInteraction);
doneButton.addEventListener("click", doneInteraction);
evaluateButton.addEventListener("click", evaluateProgress);
clarifyButton.addEventListener("click", clarifyInteraction);
restartButton.addEventListener("click", resetInteraction);
feedbackButton.addEventListener("click", submitFeedback);
settingsButton.addEventListener("click", toggleSettings);

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("darkMode") === "true") {
    document.body.classList.add("dark-mode");
  }
  loadInitialData();
});