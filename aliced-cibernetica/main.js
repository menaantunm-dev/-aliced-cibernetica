import { GoogleGenAI } from "@google/genai";

let currentLang = 'es-ES';
let chartInstance = null;
let chatHistory = JSON.parse(localStorage.getItem('aliced_history')) || [];

document.addEventListener('DOMContentLoaded', () => {
  initRoseRain();
  initChart();
  setupEventListeners();
  renderHistory();
});

// 1. Animación de Lluvia de Rosas
function initRoseRain() {
  const canvas = document.getElementById('rose-rain');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const petals = [];
  const petalCount = 40;

  for (let i = 0; i < petalCount; i++) {
    petals.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 8 + 6,
      speedY: Math.random() * 1.5 + 0.8,
      speedX: Math.random() * 0.8 - 0.4,
      rotation: Math.random() * 360,
      rotSpeed: Math.random() * 2 - 1
    });
  }

  function drawPetal(p) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate((p.rotation * Math.PI) / 180);

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.bezierCurveTo(-p.size, -p.size, -p.size, p.size / 2, 0, p.size);
    ctx.bezierCurveTo(p.size, p.size / 2, p.size, -p.size, 0, 0);
    ctx.fillStyle = '#ff2a6d';
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#ff0055';
    ctx.fill();

    ctx.restore();
  }

  function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    petals.forEach((p) => {
      p.y += p.speedY;
      p.x += p.speedX;
      p.rotation += p.rotSpeed;

      if (p.y > canvas.height) {
        p.y = -10;
        p.x = Math.random() * canvas.width;
      }
      drawPetal(p);
    });
    requestAnimationFrame(animate);
  }

  animate();
}

function setupEventListeners() {
  document.getElementById('send-btn').addEventListener('click', handleSendQuery);
  document.getElementById('user-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSendQuery();
  });

  document.getElementById('btn-speak').addEventListener('click', () => {
    speakAura("AURA IA en línea. Creada por María Mercedes Mena Antún.");
  });

  document.getElementById('btn-listen').addEventListener('click', startVoiceRecognition);

  document.getElementById('btn-toggle-history').addEventListener('click', () => {
    document.getElementById('history-panel').classList.toggle('active');
  });

  document.getElementById('btn-clear-history').addEventListener('click', () => {
    chatHistory = [];
    localStorage.removeItem('aliced_history');
    renderHistory();
  });

  document.getElementById('lang-select').addEventListener('change', (e) => {
    currentLang = e.target.value;
  });
}

// 2. Conexión Gemini con modelo activo gemini-2.5-flash
async function handleSendQuery() {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const userInputEl = document.getElementById('user-input');
  const userInput = userInputEl.value.trim();

  if (!userInput) return;

  // Renderizar la pregunta del usuario arriba en la ventana de chat
  appendMessage('Tú', userInput, 'user-msg');
  userInputEl.value = '';

  if (!apiKey) {
    appendMessage('AURA IA', 'Error: No se detectó la VITE_GEMINI_API_KEY en el archivo .env', 'aura-msg');
    return;
  }

  // Crear elemento de "Procesando..." en la ventana principal
  const loadingDiv = appendMessage('AURA IA', 'Procesando respuesta...', 'aura-msg');

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',

      contents: `Tu eres AURA IA, asistente cibernética creada por María Mercedes Mena Antún. Responde en ${currentLang}: ${userInput}`,
    });

    const reply = response.text;
    
    // Actualizar el contenido en la ventana superior
    loadingDiv.innerHTML = `<strong>AURA IA:</strong> ${reply}`;
    
    speakAura(reply);
    updateChart();
    saveToHistory(userInput, reply);

  } catch (error) {
    console.error("Error al conectar con Gemini:", error);
    loadingDiv.innerHTML = `<strong>AURA IA:</strong> Error de conexión (${error.message || error})`;
  }
}

function appendMessage(sender, text, className) {
  const chatOutput = document.getElementById('chat-output');
  const msgDiv = document.createElement('div');
  msgDiv.className = `msg ${className}`;
  msgDiv.innerHTML = `<strong>${sender}:</strong> ${text}`;
  chatOutput.appendChild(msgDiv);
  chatOutput.scrollTop = chatOutput.scrollHeight;
  return msgDiv;
}

// 3. Comandos de Voz y Reconocimiento
function startVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Tu navegador no soporta entrada de voz.");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = currentLang;
  recognition.start();

  const btnListen = document.getElementById('btn-listen');
  btnListen.innerText = "🎙️ Escuchando...";

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    document.getElementById('user-input').value = transcript;
    btnListen.innerText = "🎙️ Hablar a AURA";
    handleSendQuery();
  };

  recognition.onerror = () => {
    btnListen.innerText = "🎙️ Hablar a AURA";
  };
}

function speakAura(text) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = currentLang;
  utterance.pitch = 1.2;
  window.speechSynthesis.speak(utterance);
}

// 4. Panel de Historial
function saveToHistory(prompt, reply) {
  const item = {
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    prompt
  };
  chatHistory.unshift(item);
  localStorage.setItem('aliced_history', JSON.stringify(chatHistory));
  renderHistory();
}

function renderHistory() {
  const historyList = document.getElementById('history-list');
  historyList.innerHTML = '';

  if (chatHistory.length === 0) {
    historyList.innerHTML = '<p style="color:var(--text-muted); font-size:0.8rem;">Sin consultas guardadas.</p>';
    return;
  }

  chatHistory.forEach((item) => {
    const div = document.createElement('div');
    div.className = 'history-item';
    div.innerHTML = `
      <div class="time">⏱️ ${item.time}</div>
      <div class="prompt">Q: ${item.prompt}</div>
    `;
    historyList.appendChild(div);
  });
}

// 5. Gráfico de Rendimiento
function initChart() {
  const ctx = document.getElementById('analyticsChart');
  if (!ctx) return;
  chartInstance = new Chart(ctx.getContext('2d'), {
    type: 'line',
    data: {
      labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
      datasets: [{
        label: 'Rendimiento ALICED IA',
        data: [12, 28, 18, 35, 24, 42],
        borderColor: '#ff2a6d',
        backgroundColor: 'rgba(255, 42, 109, 0.2)',
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { labels: { color: '#ffb3c1' } } },
      scales: {
        x: { ticks: { color: '#ffb3c1' }, grid: { color: '#400d1d' } },
        y: { ticks: { color: '#ffb3c1' }, grid: { color: '#400d1d' } }
      }
    }
  });
}

function updateChart() {
  if (!chartInstance) return;
  chartInstance.data.datasets[0].data = Array.from({ length: 6 }, () => Math.floor(Math.random() * 50) + 10);
  chartInstance.update();
}

window.openModal = (id) => document.getElementById(id).style.display = 'flex';
window.closeModal = (id) => document.getElementById(id).style.display = 'none';