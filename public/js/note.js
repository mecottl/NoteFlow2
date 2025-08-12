// src/public/js/note.js
(() => {
  const API = '/api';
  const token = localStorage.getItem('token');
  if (!token) return (window.location.href = '/login');

  // --- DOM ---
  const pageTitleEl = document.getElementById('pageTitle');
  const statusEl    = document.getElementById('status');
  const titleInput  = document.getElementById('noteTitle');
  const editor      = document.getElementById('editor');
  const ghost       = document.getElementById('ghost');
  const saveBtn     = document.getElementById('saveBtn');
  const deleteBtn   = document.getElementById('deleteBtn');

  const params = new URLSearchParams(location.search);
  const id = params.get('id');

  // --- Heurísticas IA ---
  const MIN_CHARS          = 8;    // empieza a sugerir temprano
  const DEBOUNCE_MS        = 250;  // más ágil
  const MAX_CONTEXT_CHARS  = 700;  // último bloque del texto
  const MAX_TITLE_CHARS    = 120;  // título acotado
  const MAX_TOKENS         = 22;   // respuesta breve (↑ rapidez)

  // --- Estado ---
  let suggestion = '';
  let debounceTimer;
  let lastQueryText = '';
  let inFlight = 0;
  let ctrl; // AbortController
  const cache = new Map(); // snippet -> suggestion

  // Utils
  function setStatus(msg, cls = 'text-gray-400') {
    if (!statusEl) return;
    statusEl.className = `text-sm ${cls}`;
    statusEl.textContent = msg || '';
  }

  function requireAuthHeaders(json = true) {
    const h = { Authorization: `Bearer ${token}` };
    if (json) h['Content-Type'] = 'application/json';
    return h;
  }

  function escapeHTML(str = '') {
    return str.replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[c])
    );
  }

  function atEnd(textarea) {
    return textarea.selectionStart === textarea.value.length &&
           textarea.selectionEnd   === textarea.value.length;
  }

  function syncHeights() {
    ghost.style.height = 'auto';
    editor.style.height = 'auto';
    const h = Math.max(ghost.scrollHeight, editor.scrollHeight, 360);
    ghost.style.height = h + 'px';
    editor.style.height = h + 'px';
  }

  function mirrorScroll() {
    ghost.scrollTop = editor.scrollTop;
    ghost.scrollLeft = editor.scrollLeft;
  }

  function renderGhost() {
    const base = escapeHTML(editor.value || '');
    const sug  = suggestion ? `<span class="ghost-suggest">${escapeHTML(suggestion)} ⇥TAB</span>` : '';
    ghost.innerHTML = base + sug;
    syncHeights();
  }

  // Prompt compacto: solo últimos N chars + título recortado
  function buildPrompt(text, title) {
    const t = (text || '');
    const last = t.slice(-MAX_CONTEXT_CHARS);
    const titleTrim = (title || '').slice(0, MAX_TITLE_CHARS);
    return (
      (titleTrim ? `Título: ${titleTrim}\n` : '') +
      `Nota (tramo final):\n${last}\n\n` +
      `Continúa el texto de forma breve, coherente y contextual al título.`
    );
  }

  // --- CRUD ---
  async function loadNote() {
    if (!id) {
      pageTitleEl && (pageTitleEl.textContent = 'Nueva Nota AI');
      deleteBtn && (deleteBtn.style.display = 'none');
      renderGhost();
      return;
    }
    pageTitleEl && (pageTitleEl.textContent = `Editando Nota #${id}`);
    setStatus('Cargando nota...');
    try {
      const res = await fetch(`${API}/notes/${id}`, { headers: requireAuthHeaders(false) });
      if (res.status === 401) { localStorage.removeItem('token'); return location.href = '/login'; }
      if (!res.ok) throw new Error('No se pudo cargar la nota');
      const note = await res.json();
      titleInput.value = note.title || '';
      editor.value = note.text || '';
      suggestion = '';
      renderGhost();
      setStatus('');
    } catch (e) {
      console.error(e);
      setStatus('Error cargando la nota.', 'text-red-400');
    }
  }

  async function saveNote() {
    const title = (titleInput.value || '').trim();
    const text  = (editor.value || '').trim();
    if (!title) return setStatus('El título no puede estar vacío.', 'text-yellow-400');
    if (!text)  return setStatus('La nota está vacía.', 'text-yellow-400');

    saveBtn && (saveBtn.disabled = true, saveBtn.classList.add('opacity-70','cursor-not-allowed'));
    try {
      if (id) {
        const r = await fetch(`${API}/notes/${id}`, {
          method: 'PUT',
          headers: requireAuthHeaders(true),
          body: JSON.stringify({ title, text })
        });
        if (!r.ok) throw new Error('No se pudo actualizar la nota');
      } else {
        const r = await fetch(`${API}/notes`, {
          method: 'POST',
          headers: requireAuthHeaders(true),
          body: JSON.stringify({ title, text })
        });
        if (!r.ok) throw new Error('No se pudo crear la nota');
      }
      location.href = '/notes';
    } catch (e) {
      console.error(e);
      setStatus(e.message, 'text-red-400');
    } finally {
      saveBtn && (saveBtn.disabled = false, saveBtn.classList.remove('opacity-70','cursor-not-allowed'));
    }
  }

  async function deleteNote() {
    if (!id) return;
    if (!confirm('¿Eliminar esta nota?')) return;
    deleteBtn && (deleteBtn.disabled = true, deleteBtn.classList.add('opacity-70','cursor-not-allowed'));
    try {
      const r = await fetch(`${API}/notes/${id}`, { method: 'DELETE', headers: requireAuthHeaders(false) });
      if (!r.ok) throw new Error('No se pudo eliminar la nota');
      location.href = '/notes';
    } catch (e) {
      console.error(e);
      setStatus(e.message, 'text-red-400');
    } finally {
      deleteBtn && (deleteBtn.disabled = false, deleteBtn.classList.remove('opacity-70','cursor-not-allowed'));
    }
  }

  // --- IA ---
  async function fetchSuggestion(text, title) {
    const snippet = (text || '').slice(-MAX_CONTEXT_CHARS);
    // cache hit
    if (cache.has(snippet)) {
      suggestion = cache.get(snippet);
      renderGhost();
      return;
    }

    // cancela request anterior si existe
    if (ctrl) ctrl.abort();
    ctrl = new AbortController();

    const prompt = buildPrompt(text, title);
    const thisReq = ++inFlight;

    try {
      const res = await fetch(`${API}/ai/complete`, {
        method: 'POST',
        headers: requireAuthHeaders(true),
        body: JSON.stringify({ prompt, max_tokens: MAX_TOKENS, temperature: 0.6 }),
        signal: ctrl.signal
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || 'IA no disponible');
      }
      const { suggestion: s } = await res.json();
      if (thisReq === inFlight) {
        suggestion = s || '';
        cache.set(snippet, suggestion);
        renderGhost();
      }
    } catch (e) {
      if (e.name === 'AbortError') return;
      suggestion = '';
      renderGhost();
      console.debug('IA error:', e.message);
    }
  }

  function scheduleSuggest() {
    clearTimeout(debounceTimer);
    suggestion = '';
    renderGhost();

    const text = editor.value || '';
    if (text.length < MIN_CHARS) return;

    // solo dispara si el usuario hizo pequeña pausa o cerró palabra/segmento
    // (último char es espacio o puntuación, o han pasado DEBOUNCE_MS)
    const lastChar = text.slice(-1);
    const looksLikeBoundary = /[\s\.\,\;\:\!\?]/.test(lastChar);

    debounceTimer = setTimeout(() => {
      // evita golpes repetidos
      if (text === lastQueryText && suggestion) return;
      lastQueryText = text;
      const title = (titleInput.value || '').trim();
      fetchSuggestion(text, title);
    }, looksLikeBoundary ? 200 : DEBOUNCE_MS);
  }

  function acceptSuggestion() {
    if (!suggestion) return;
    if (!atEnd(editor)) return;
    const needsSpace = editor.value && !/\s$/.test(editor.value);
    const toInsert = (needsSpace ? ' ' : '') + suggestion;
    const pos = editor.value.length;
    editor.value = editor.value.slice(0, pos) + toInsert + editor.value.slice(pos);
    editor.setSelectionRange(pos + toInsert.length, pos + toInsert.length);
    suggestion = '';
    renderGhost();
    // prepara siguiente sugerencia
    setTimeout(scheduleSuggest, 220);
  }

  // --- Eventos ---
  editor.addEventListener('input', () => { renderGhost(); scheduleSuggest(); });
  
  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && suggestion) {
      e.preventDefault();
      acceptSuggestion();
    }
  });
  editor.addEventListener('scroll', mirrorScroll);
  window.addEventListener('resize', syncHeights);

  saveBtn && saveBtn.addEventListener('click', saveNote);
  deleteBtn && deleteBtn.addEventListener('click', deleteNote);

  // init
  renderGhost();
  loadNote();
})();
