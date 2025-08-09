(() => {
  const form = document.getElementById('loginForm');
  const messageEl = document.getElementById('message');
  const submitBtn = document.getElementById('submitBtn');
  const API = '/api';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    messageEl.textContent = '';
    messageEl.className = 'text-center text-sm';
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-70', 'cursor-not-allowed');
    submitBtn.textContent = 'Ingresando...';

    const credentials = {
      email: form.email.value.trim(),
      password: form.password.value
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
        messageEl.textContent = msg;
        messageEl.classList.add('text-red-400');
      } else {
        messageEl.textContent = '¡Login exitoso!';
        messageEl.classList.add('text-green-400');
        localStorage.setItem('token', data.token);
        setTimeout(() => { window.location.href = '/notes'; }, 500);
      }
    } catch {
      messageEl.textContent = 'Error de conexión';
      messageEl.classList.add('text-red-400');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-70', 'cursor-not-allowed');
      submitBtn.textContent = 'Login';
    }
  });
})();
