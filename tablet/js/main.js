// ── Ponto de entrada — inicialização e event listeners ────────

function iniciar() {
  localStorage.removeItem('rotaads_anuncios_cache');
  localStorage.removeItem('rotaads_clima_cache');
  localStorage.removeItem('rotaads_clima_ts');
  localStorage.removeItem('rotaads_noticias_cache');
  localStorage.removeItem('rotaads_noticias_ts');
  if (!tabletId) { telaLoading.style.display = 'none'; abrirConfig(); return; }
  carregarAnuncios();
}

// Barra auto-ocultar — inicia escondida após 1.5 s
timerBarra = setTimeout(esconderBarra, 1500);
document.addEventListener('click',      mostrarBarra);
document.addEventListener('touchstart', mostrarBarra, { passive: true });

// Config — 3 toques no canto inferior direito
let toques = 0, timerToques;
document.addEventListener('click', e => {
  if (e.clientX > window.innerWidth * 0.8 && e.clientY > window.innerHeight * 0.8) {
    toques++;
    clearTimeout(timerToques);
    timerToques = setTimeout(() => toques = 0, 1500);
    if (toques >= 3) { toques = 0; abrirConfig(); }
  }
});

// Swipe para navegar entre anúncios
let touchStartX = 0, touchStartY = 0;
document.addEventListener('touchstart', e => {
  touchStartX = e.touches[0].clientX;
  touchStartY = e.touches[0].clientY;
}, { passive: true });
document.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
    clearTimeout(timerExibicao);
    indiceAtual = dx < 0
      ? (indiceAtual + 1) % anunciosAtivos.length
      : (indiceAtual - 1 + anunciosAtivos.length) % anunciosAtivos.length;
    exibirAnuncio();
  }
}, { passive: true });

iniciar();
