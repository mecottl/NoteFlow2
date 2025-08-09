// public/js/register.js
(() => {
  const API = '/api';
  const form = document.getElementById('registerForm');
  const messageEl = document.getElementById('message');
  const submitBtn = document.getElementById('submitBtn');
  const usernameInput = document.getElementById('username');

  // Regex estricta: 3–20, letras/números; - y _ solo entre caracteres
  const USERNAME_RE = /^(?=.{3,20}$)[a-zA-Z0-9]+(?:[_-][a-zA-Z0-9]+)*$/;

  // Hint visual bajo el input de username
  let hint = document.getElementById('userCheck');
  if (!hint) {
    hint = document.createElement('small');
    hint.id = 'userCheck';
    hint.className = 'block mt-1 text-sm';
    usernameInput?.parentElement?.appendChild(hint);
  }

  // --- Debounce + cancelación ---
  let t; // timer
  let lastQueried = ''; // evita pedir lo mismo
  let ctrl; // AbortController
  let usernameAvailable = false; // estado para bloquear el submit

  function setHint(text, cls = 'text-gray-400') {
    hint.textContent = text || '';
    hint.className = `block mt-1 text-sm ${cls}`;
  }

  async function checkAvailability(val) {
    // Cancela request anterior si existe
    if (ctrl) ctrl.abort();
    ctrl = new AbortController();

    setHint('Comprobando disponibilidad…', 'text-gray-400');

    try {
      const r = await fetch(`${API}/username-availability?u=${encodeURIComponent(val)}`, {
        signal: ctrl.signal
      });
      const data = await r.json();
      if (data.available) {
        usernameAvailable = true;
        setHint('Disponible ✔', 'text-green-400');
      } else {
        usernameAvailable = false;
        setHint(
          data.reason === 'invalid' ? 'Formato inválido' : 'No disponible ✖',
          'text-red-400'
        );
      }
    } catch (e) {
      if (e.name === 'AbortError') return; // ignorar cancelaciones
      usernameAvailable = false;
      setHint('No se pudo verificar', 'text-yellow-400');
    } finally {
      // Habilita o deshabilita el submit según disponibilidad
      submitBtn.disabled = !usernameAvailable;
      submitBtn.classList.toggle('opacity-70', !usernameAvailable);
      submitBtn.classList.toggle('cursor-not-allowed', !usernameAvailable);
    }
  }

  usernameInput?.addEventListener('input', () => {
    clearTimeout(t);

    const raw = (usernameInput.value || '').trim();
    const val = raw.toLowerCase();

    // Estado base
    usernameAvailable = false;
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-70', 'cursor-not-allowed');

    if (!val) {
      setHint('');
      return;
    }

    // Validación rápida local
    if (!USERNAME_RE.test(val)) {
      setHint('Username inválido (3–20, letras/números; - y _ solo en medio)', 'text-red-400');
      return;
    }

    // Evita hits repetidos
    if (val === lastQueried) return;
    lastQueried = val;

    // Debounce real
    t = setTimeout(() => checkAvailability(val), 400);
  });

  // --- Submit registro ---
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    messageEl.textContent = '';
    messageEl.className = 'text-center text-sm';

    const usernameRaw = (form.username?.value || '').trim();
    const username = usernameRaw.toLowerCase(); // normaliza

    // Validación rápida local
    if (!USERNAME_RE.test(username)) {
      messageEl.textContent = 'Username inválido (3–20, letras/números; - y _ solo en medio)';
      messageEl.classList.add('text-red-400');
      return;
    }

    // Si el hint dijo no disponible, bloquea (la API también valida, pero mejor UX)
    if (!usernameAvailable) {
      messageEl.textContent = 'El username no está disponible';
      messageEl.classList.add('text-red-400');
      return;
    }

    // Bloquea botón durante la petición
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-70', 'cursor-not-allowed');
    submitBtn.textContent = 'Registrando...';

    const formData = {
      email: form.email.value.trim(),
      password: form.password.value,
      username
    };

    try {
      const res = await fetch(`${API}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data?.errors
          ? data.errors.map(e => `${e.field}: ${e.message}`).join(', ')
          : (data?.error || 'Error desconocido');
        messageEl.textContent = msg;
        messageEl.classList.add('text-red-400');
      } else {
        messageEl.textContent = '¡Registro exitoso!';
        messageEl.classList.add('text-green-400');
        localStorage.setItem('token', data.token);
        window.location.href = '/notes';
      }
    } catch {
      messageEl.textContent = 'Error de conexión';
      messageEl.classList.add('text-red-400');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
      submitBtn.textContent = 'Register';
    }
  });
})();
