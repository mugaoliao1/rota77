// ── Modal de prévia do anúncio ────────────────────────────────
function abrirPreviaIdx(idx) {
  const a = (window._anuncioLista || [])[idx];
  if (!a) { console.warn('anuncio não encontrado idx:', idx); return; }
  console.log('abrindo prévia:', a.titulo, a.url, a.tipo);

  const modal = document.getElementById('modal-previa');
  const img = document.getElementById('previa-img');
  const video = document.getElementById('previa-video');
  const placeholder = document.getElementById('previa-placeholder');

  img.style.display = 'none';
  video.style.display = 'none';
  placeholder.style.display = 'none';

  document.getElementById('previa-info').textContent = a.titulo || a.nome || 'Anúncio';
  document.getElementById('previa-duracao').textContent = (a.duracao||10) + 's';

  if (!a.url) {
    placeholder.style.display = 'flex';
  } else if (a.tipo === 'video') {
    video.src = a.url;
    video.style.display = 'block';
    video.load();
    video.play().catch(e => console.warn('play bloqueado:', e));
  } else {
    img.src = a.url;
    img.style.display = 'block';
  }

  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function fecharPrevia() {
  const video = document.getElementById('previa-video');
  video.pause(); video.src = '';
  document.getElementById('modal-previa').classList.remove('show');
  document.body.style.overflow = '';
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('previa-fechar').onclick = fecharPrevia;
  document.getElementById('modal-previa').onclick = function(e) {
    if (e.target === this) fecharPrevia();
  };
});
