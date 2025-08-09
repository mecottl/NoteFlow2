(() => {
  const form = document.getElementById('registerForm');
  const messageEl = document.getElementById('message');
  const submitBtn = document.getElementById('submitBtn');
  const API = '/api';

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    messageEl.textContent = '';
    messageEl.className = 'text-center text-sm';
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-70','cursor-not-allowed');
    submitBtn.textContent = 'Registrando...';

    const formData = {
      email: form.email.value.trim(),
      password: form.password.value
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
        // Opcional: auto-login
        // localStorage.setItem('token', data.token);
        // window.location.href = '/notes';
      }
    } catch {
      messageEl.textContent = 'Error de conexión';
      messageEl.classList.add('text-red-400');
    } finally {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-70','cursor-not-allowed');
      submitBtn.textContent = 'Register';
    }
  });
})();
