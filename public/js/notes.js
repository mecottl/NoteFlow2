// public/js/notes.js
(() => {
  const API = '/api';
  const grid = document.getElementById('notesGrid');
  const statusEl = document.getElementById('status');
  const logoutLink = document.getElementById('logoutLink');
  const helloEl = document.getElementById('helloUser');

  const token = localStorage.getItem('token');
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
    statusEl.className = `mb-6 text-sm ${cls}`;
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
    a.className = 'block bg-gray-900 p-7 rounded-xl shadow-xl border-2 border-purple-900 card-glow';
    a.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-2xl font-semibold text-purple-400 line-clamp-3">
          ${escapeHTML(note.title || `Nota #${note.id}`)}
        </h3>
        <span class="text-purple-500 text-xs">${fmt(note.updated_at || note.created_at)}</span>
      </div>
      <p class="text-gray-300 text-base mb-1 line-clamp-3">
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
      notes.forEach((n) => grid.appendChild(card(n)));
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
