// ── Helpers de UI — barra de progresso, status e tela offline ─

function atualizarProgresso() {
  barraProgresso.innerHTML = anunciosAtivos
    .map((_,i) => `<div class="prog-dot ${i===indiceAtual?'ativo':''}"></div>`)
    .join('');
}

function atualizarStatusDot(isOnline) {
  statusDot.classList.toggle('offline', !isOnline);
}

function mostrarOffline() {
  telaLoading.style.display  = 'none';
  telaAnuncios.style.display = 'none';
  telaOffline.classList.add('show');
  clearTimeout(timerExibicao);
}
