(() => {

  // Ruteo principal
  const API = '/api';
  const token = localStorage.getItem('token');
  if (!token) return (window.location.href = '/login');

  // DOM
  const pageTitleEl = document.getElementById('pageTitle'); // Titulo
  const statusEl    = document.getElementById('status'); 
  const titleInput  = document.getElementById('noteTitle'); // Titulo de nota
  const editor      = document.getElementById('editor'); // Texto
  const ghost       = document.getElementById('ghost'); // IA Ghost
  const saveBtn     = document.getElementById('saveBtn'); // Btn save
  const deleteBtn   = document.getElementById('deleteBtn'); // Btn Delete

  const params = new URLSearchParams(location.search);
  const id = params.get('id'); // si no hay, es nota nueva

  // JWT utils (para key de borradores)
  function parseJWT(t) {
    try { return JSON.parse(atob(t.split('.')[1])); } catch { return null; }
  }
  const payload = parseJWT(token) || {};
  const userKey = payload.sub || payload.email || payload.username || 'anon';
  const DRAFT_KEY = (noteId) => `nf3:draft:${userKey}:${noteId || 'new'}`;

  // --- Heurísticas IA ---
  const MIN_CHARS         = 8;
  const DEBOUNCE_MS       = 250;
  const MAX_CONTEXT_CHARS = 700;
  const MAX_TITLE_CHARS   = 120;
  const MAX_TOKENS        = 22;

  // --- Estado IA ---
  let suggestion = '';
  let debounceTimer;
  let lastQueryText = '';
  let inFlight = 0;
  let ctrl; // AbortController
  const cache = new Map(); // snippet -> suggestion

  // --- Estado draft ---
  let saveDraftTimer;

  // --- Utils UI/HTTP ---
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

  // Con altura fija (h-[70vh] en HTML), no cambiamos heights via JS
  function mirrorScroll() {
    ghost.scrollTop  = editor.scrollTop;
    ghost.scrollLeft = editor.scrollLeft;
  }

  function renderGhost() {
    const base = escapeHTML(editor.value || '');
    const sug  = suggestion
      ? `<span class="text-purple-400/80">${escapeHTML(suggestion)} ⇥TAB</span>`
      : '';
    // Espacio separador si hace falta
    const needsSpace = suggestion && editor.value && !/\s$/.test(editor.value);
    ghost.innerHTML = base + (needsSpace ? '&nbsp;' : '') + sug;
    // alturas ya están definidas por CSS (h-full)
    mirrorScroll();
  }

  // Prompt compacto: últimos N chars + título
  function buildPrompt(text, title) {
    const last = (text || '').slice(-MAX_CONTEXT_CHARS);
    const titleTrim = (title || '').slice(0, MAX_TITLE_CHARS);
    return (
      (titleTrim ? `Título: ${titleTrim}\n` : '') +
      `Nota (tramo final):\n${last}\n\n` +
      `Continúa el texto de forma breve, coherente y contextual al título.`
    );
  }

  // --- Borradores (localStorage) ---
  function saveDraftDebounced() {
    clearTimeout(saveDraftTimer);
    saveDraftTimer = setTimeout(() => {
      const draft = {
        title: titleInput.value || '',
        text:  editor.value     || '',
        ts: Date.now()
      };
      try {
        localStorage.setItem(DRAFT_KEY(id), JSON.stringify(draft));
        setStatus('Borrador guardado localmente', 'text-gray-400');
      } catch {}
    }, 300);
  }

  function tryRestoreDraft(serverNoteTs) {
    try {
      const raw = localStorage.getItem(DRAFT_KEY(id));
      if (!raw) return false;
      const draft = JSON.parse(raw);
      if (!draft) return false;

      const draftIsNewer =
        typeof draft.ts === 'number' &&
        (!serverNoteTs || draft.ts > serverNoteTs);

      if (draftIsNewer || !serverNoteTs) {
        titleInput.value = draft.title || '';
        editor.value     = draft.text  || '';
        suggestion = '';
        renderGhost();
        setStatus('Borrador restaurado', 'text-green-400');
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // --- CRUD ---
  async function loadNote() {
    if (!id) {
      pageTitleEl && (pageTitleEl.textContent = 'Nueva Nota AI');
      deleteBtn && (deleteBtn.style.display = 'none');

      // Restaurar borrador de "new"
      tryRestoreDraft(null);
      renderGhost();
      return;
    }

    pageTitleEl && (pageTitleEl.textContent = `Editando Nota`);
    setStatus('Cargando nota...');

    try {
      const res = await fetch(`${API}/notes/${id}`, { headers: requireAuthHeaders(false) });
      if (res.status === 401) { localStorage.removeItem('token'); return (location.href = '/login'); }
      if (!res.ok) throw new Error('No se pudo cargar la nota');
      const note = await res.json();

      const serverTs = note.updated_at ? new Date(note.updated_at).getTime()
                     : note.created_at ? new Date(note.created_at).getTime()
                     : 0;

      // Si hay borrador más nuevo, restaurarlo; si no, usar servidor
      const restored = tryRestoreDraft(serverTs);
      if (!restored) {
        titleInput.value = note.title || '';
        editor.value     = note.text  || '';
        suggestion = '';
        renderGhost();
        setStatus('');
      }
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
          method: 'PUT', headers: requireAuthHeaders(true), body: JSON.stringify({ title, text })
        });
        if (!r.ok) throw new Error('No se pudo actualizar la nota');
      } else {
        const r = await fetch(`${API}/notes`, {
          method: 'POST', headers: requireAuthHeaders(true), body: JSON.stringify({ title, text })
        });
        if (!r.ok) throw new Error('No se pudo crear la nota');
      }
      // limpiar borrador de esta nota
      localStorage.removeItem(DRAFT_KEY(id));
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
      localStorage.removeItem(DRAFT_KEY(id));
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
    if (cache.has(snippet)) {
      suggestion = cache.get(snippet);
      renderGhost();
      return;
    }

    if (ctrl) ctrl.abort();
    ctrl = new AbortController();
    const thisReq = ++inFlight;

    try {
      const res = await fetch(`${API}/ai/complete`, {
        method: 'POST',
        headers: requireAuthHeaders(true),
        body: JSON.stringify({
          prompt: buildPrompt(text, title),
          max_tokens: MAX_TOKENS,
          temperature: 0.6
        }),
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

    const lastChar = text.slice(-1);
    const looksLikeBoundary = /[\s\.\,\;\:\!\?]/.test(lastChar);

    debounceTimer = setTimeout(() => {
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
    saveDraftDebounced();     // guardar tras aceptar
    setTimeout(scheduleSuggest, 220);
  }
    // Contador de palabras en tiempo real
    const wordCount = document.getElementById('wordCount');
    
    function updateWordCount() {
      const text = editor.value.trim();
      const words = text === '' ? 0 : text.split(/\s+/).length;
      wordCount.textContent = words.toLocaleString();
    }
    
    editor.addEventListener('input', updateWordCount);
    updateWordCount(); // Inicializar
  

  // --- Eventos ---
  editor.addEventListener('input', () => { renderGhost(); scheduleSuggest(); saveDraftDebounced(); });
  titleInput.addEventListener('input', () => { saveDraftDebounced(); });

  editor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab' && suggestion) { e.preventDefault(); acceptSuggestion(); }
  });
  editor.addEventListener('scroll', mirrorScroll);

  saveBtn  && saveBtn.addEventListener('click', saveNote);
  deleteBtn&& deleteBtn.addEventListener('click', deleteNote);

  // ----------------------------------------
    
  if (!editor || !ghost) return;

  const THRESHOLD = 32; // px desde el fondo para considerar "estoy abajo"

  const atBottom = (el) =>
    el.scrollTop + el.clientHeight >= el.scrollHeight - THRESHOLD;

  const caretNearEnd = () =>
    typeof editor.selectionStart === 'number' &&
    editor.selectionStart >= editor.value.length - 1;

  const syncScroll = () => {
    ghost.scrollTop  = editor.scrollTop;
    ghost.scrollLeft = editor.scrollLeft;
  };

  const maybeAutoScroll = (force = false) => {
    const should = force || atBottom(editor) || caretNearEnd();
    if (should) {
      // Toma el mayor alto entre capas y baja hasta el final
      const target = Math.max(editor.scrollHeight, ghost.scrollHeight);
      editor.scrollTop = target;
      ghost.scrollTop  = editor.scrollTop;
    }
  };

  // Mientras escribes
  editor.addEventListener('input', () => {
    requestAnimationFrame(() => maybeAutoScroll(false));
  });

  // Si haces scroll manual, que el ghost “siga”
  editor.addEventListener('scroll', syncScroll);

  // Si el ghost cambia (p.ej. IA mete sugerencias), también autoscroll si estabas abajo
  const mo = new MutationObserver(() => {
    requestAnimationFrame(() => maybeAutoScroll(false));
  });
  mo.observe(ghost, { childList: true, subtree: true, characterData: true });

  // Utilidad opcional: si en otro lado actualizas el ghost
  window.updateGhost = (html) => {
    const wasBottom = atBottom(editor);
    ghost.innerHTML = html;
    requestAnimationFrame(() => maybeAutoScroll(wasBottom));
  };

  // Alineación inicial
  requestAnimationFrame(() => { syncScroll(); maybeAutoScroll(true); });

  // init
  renderGhost();
  loadNote();
})();
