(() => {
  const form = document.getElementById('loginForm');
  const messageEl = document.getElementById('message');
  const submitBtn = document.getElementById('submitBtn');
  const API = '/api';

  function setMessage(type, text) {
    messageEl.className = 'message';
    if (type) messageEl.classList.add(type);
    messageEl.textContent = text || '';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    setMessage('info', 'Procesando...');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Ingresando...';

    const credentials = {
      email: form.email.value.trim(),
      password: form.password.value,
      remember: !!form.remember.checked
    };

    try {
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = data?.errors
          ? data.errors.map(err => `${err.field}: ${err.message}`).join(', ')
          : (data?.error || 'Error desconocido');
        setMessage('error', msg);
      } else {
        setMessage('success', '¡Login exitoso!');
        // Persistencia según "recordar sesión"
        if (credentials.remember) {
          sessionStorage.removeItem('token');
          localStorage.setItem('token', data.token);
        } else {
          localStorage.removeItem('token');
          sessionStorage.setItem('token', data.token);
        }
        setTimeout(() => { window.location.href = '/notes'; }, 500);
      }
    } catch {
      setMessage('error', 'Error de conexión');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Login';
    }
  });
})();
