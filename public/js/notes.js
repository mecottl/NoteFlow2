// public/js/notes.js
(() => {
  const API = '/api';
  const grid = document.getElementById('notesGrid');
  const statusEl = document.getElementById('status');
  const logoutLink = document.getElementById('logoutLink');
  const helloEl = document.getElementById('helloUser');

  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) return (window.location.href = '/login');

  // Decodifica JWT (base64url-safe)
  function parseJWT(t) {
    try {
      const base64Url = t.split('.')[1] || '';
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const json = atob(padded)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('');
      return JSON.parse(decodeURIComponent(json));
    } catch {
      return null;
    }
  }

  // Valida token y expiración
  const payload = parseJWT(token);
  if (!payload || (payload.exp && payload.exp * 1000 < Date.now())) {
    localStorage.removeItem('token');
    return (window.location.href = '/login');
  }

  // Saludo con username (o parte local del email como fallback)
  if (helloEl) {
    const displayName = payload.username || (payload.email ? payload.email.split('@')[0] : 'usuario');
    helloEl.textContent = `Hola, ${displayName}`;
  }

  function setStatus(msg, cls = 'text-gray-400') {
    statusEl.className = `status-message ${cls}`;
    statusEl.textContent = msg || '';
  }

  const fmt = (iso) => (!iso ? '' : new Date(iso).toLocaleString());

  function escapeHTML(str = '') {
    return str.replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])
    );
  }

  function card(note) {
    const a = document.createElement('a');
    a.href = `/note?id=${note.id}`;
    a.className = 'note-card fade-in';
    a.innerHTML = `
      <div class="card-header">
        <h3 class="note-title">
          ${escapeHTML(note.title || `Nota #${note.id}`)}
        </h3>
        <span class="note-date">${fmt(note.updated_at || note.created_at)}</span>
      </div>
      <p class="note-content">
        ${escapeHTML(note.text || '')}
      </p>
    `;
    return a;
  }

  async function loadNotes() {
    setStatus('Cargando notas...');
    grid.innerHTML = '';
    try {
      const res = await fetch(`${API}/notes`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store'
      });

      if (res.status === 401) {
        localStorage.removeItem('token');
        return (location.href = '/login');
      }
      if (!res.ok) throw new Error('No se pudieron cargar las notas');

      const notes = await res.json();
      if (!Array.isArray(notes) || notes.length === 0) {
        setStatus('Sin notas. Crea la primera arriba.');

        return;
      }

      setStatus('');
      notes.forEach((n, index) => {
        const cardEl = card(n);
        // Add staggered animation delay
        cardEl.style.animationDelay = `${index * 0.1}s`;
        grid.appendChild(cardEl);
      });
    } catch (e) {
      console.error(e);
      setStatus('Error cargando notas.', 'text-red-400');
    }
  }

  logoutLink?.addEventListener('click', (ev) => {
    ev.preventDefault();
    localStorage.removeItem('token');
    location.href = '/login';
  });

  loadNotes();
})();