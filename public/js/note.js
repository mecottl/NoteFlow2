(() => {
  const API_BASE = '/api';
  const token = localStorage.getItem('token');
  if (!token) window.location.href = '/login';

  const params = new URLSearchParams(location.search);
  const id = params.get('id'); // si existe, estamos editando

  const pageTitleEl = document.getElementById('pageTitle');
  const noteTitleInput = document.getElementById('noteTitle');
  const editor = document.getElementById('editor');
  const statusEl = document.getElementById('status');
  const saveBtn = document.getElementById('saveBtn');
  const deleteBtn = document.getElementById('deleteBtn');

  function setStatus(msg, cls='text-gray-400'){
    statusEl.className = `text-sm ${cls}`;
    statusEl.textContent = msg || '';
  }

  async function loadNote(){
    if (!id) { 
      pageTitleEl.textContent = 'Nueva Nota';
      deleteBtn.style.display = 'none';
      return;
    }
    setStatus('Cargando nota...');
    try {
      const res = await fetch(`${API_BASE}/notes/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.status === 401){ localStorage.removeItem('token'); return location.href = '/login'; }
      if (!res.ok) throw new Error('No se pudo cargar la nota');

      const note = await res.json();
      noteTitleInput.value = note.title || '';
      editor.value = note.text || '';
      setStatus('');
    } catch (e) {
      console.error(e);
      setStatus('Error cargando la nota.', 'text-red-400');
    }
  }

  async function saveNote(){
    const title = (noteTitleInput.value || '').trim();
    const text  = (editor.value || '').trim();

    if (!title || !text){
      return setStatus('No se puede guardar una nota vacía.', 'text-yellow-400');
    }

    saveBtn.disabled = true;
    saveBtn.classList.add('opacity-70','cursor-not-allowed');

    try {
      if (id) {
        const res = await fetch(`${API_BASE}/notes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title, text })
        });
        if (!res.ok) throw new Error('No se pudo actualizar la nota');
      } else {
        const res = await fetch(`${API_BASE}/notes`, {
          method: 'POST',
          headers: { 'Content-Type':'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ title, text })
        });
        if (!res.ok) throw new Error('No se pudo crear la nota');
      }
      location.href = '/notes';
    } catch (e) {
      console.error(e);
      setStatus(e.message, 'text-red-400');
    } finally {
      saveBtn.disabled = false;
      saveBtn.classList.remove('opacity-70','cursor-not-allowed');
    }
  }

  async function deleteNote(){
    if (!id) return;
    if (!confirm('¿Estás seguro de eliminar esta nota?')) return;

    deleteBtn.disabled = true;
    deleteBtn.classList.add('opacity-70','cursor-not-allowed');

    try {
      const res = await fetch(`${API_BASE}/notes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('No se pudo eliminar la nota');
      location.href = '/notes';
    } catch (e) {
      console.error(e);
      setStatus(e.message, 'text-red-400');
    } finally {
      deleteBtn.disabled = false;
      deleteBtn.classList.remove('opacity-70','cursor-not-allowed');
    }
  }

  saveBtn.addEventListener('click', saveNote);
  deleteBtn.addEventListener('click', deleteNote);
  loadNote();
})();
