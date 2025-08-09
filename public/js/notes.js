(() => {
  const API = '/api';
  const grid = document.getElementById('notesGrid');
  const statusEl = document.getElementById('status');
  const logoutLink = document.getElementById('logoutLink');
  const token = localStorage.getItem('token');

  if (!token) window.location.href = '/login';

  function setStatus(msg, cls='text-gray-400'){
    statusEl.className = `mb-6 text-sm ${cls}`;
    statusEl.textContent = msg || '';
  }
  const fmt = iso => !iso ? '' : new Date(iso).toLocaleString();

  function card(note){
    const a = document.createElement('a');
    a.href = `/note?id=${note.id}`;
    a.className = 'block bg-gray-900 p-7 rounded-xl shadow-xl border-2 border-purple-900 card-glow';
    a.innerHTML = `
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-2xl font-semibold text-purple-400">${(note.title || `Nota #${note.id}`)}</h3>
        <span class="text-purple-500 text-xs">${fmt(note.updated_at || note.created_at)}</span>
      </div>
      <p class="text-gray-300 text-sm mb-1 line-clamp-3">${(note.text || '').replace(/</g,'&lt;')}</p>
    `;
    return a;
  }

  async function loadNotes(){
    setStatus('Cargando notas...');
    grid.innerHTML = '';
    try{
      const res = await fetch(`${API}/notes`, { headers: { Authorization: `Bearer ${token}` }});
      if (res.status === 401){ localStorage.removeItem('token'); return location.href='/login'; }
      if (!res.ok) throw new Error('No se pudieron cargar las notas');
      const notes = await res.json();
      if (!Array.isArray(notes) || notes.length===0){ setStatus('Sin notas. Crea la primera arriba.'); return; }
      setStatus('');
      notes.forEach(n => grid.appendChild(card(n)));
    }catch(e){
      console.error(e);
      setStatus('Error cargando notas.', 'text-red-400');
    }
  }

  logoutLink.addEventListener('click', (ev)=>{ ev.preventDefault(); localStorage.removeItem('token'); location.href='/login'; });
  loadNotes();
})();
