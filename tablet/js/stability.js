// ── Estabilidade 24h — Page Visibility API + Screen Wake Lock ─
//
// _pausarPlayer() : cancela timers, pausa vídeo, para relógio
// _retomarPlayer(): renova wake lock, limpa timers residuais, reinicia exibição
// solicitarWakeLock(): mantém tela ligada (falha silenciosa em browsers sem suporte)
// _pendingSwUpdate : flag — SW novo instalado, aguarda proximoAnuncio() para reload

let _wakeLock = null

// ── Atualização segura do Service Worker ─────────────────────
// Seta flag quando SW notifica nova versão; reload ocorre entre anúncios
let _pendingSwUpdate = false

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'SW_UPDATED') {
      _pendingSwUpdate = true
    }
  })
}

// ── Wake Lock ─────────────────────────────────────────────────
async function solicitarWakeLock() {
  if (!('wakeLock' in navigator)) return          // browser sem suporte — ignora
  if (_wakeLock) return                            // já ativo
  try {
    _wakeLock = await navigator.wakeLock.request('screen')
    _wakeLock.addEventListener('release', () => { _wakeLock = null })
  } catch (_) {}                                   // battery saver ou aba em background
}

// ── Pausar tudo ───────────────────────────────────────────────
function _pausarPlayer() {
  // Para todos os timers do player
  clearTimeout(timerExibicao);  timerExibicao = null
  clearTimeout(timerMomento1);  timerMomento1 = null
  clearTimeout(timerMomento2);  timerMomento2 = null

  // Para vídeo se estiver reproduzindo
  if (anuncioVideo && !anuncioVideo.paused) anuncioVideo.pause()

  // Para o relógio do slot clima
  pararRelogioClima()
}

// ── Retomar exibição ──────────────────────────────────────────
function _retomarPlayer() {
  // Renova wake lock (foi liberado quando aba foi ao background)
  solicitarWakeLock()

  // Limpa qualquer timer residual que possa ter disparado durante o hidden
  clearTimeout(timerExibicao);  timerExibicao = null
  clearTimeout(timerMomento1);  timerMomento1 = null
  clearTimeout(timerMomento2);  timerMomento2 = null

  // Esconde overlay do Momento MídiaCar se ficou visível durante o pause
  const momento = document.getElementById('momento-midiacar')
  if (momento && momento.classList.contains('show')) {
    momento.classList.remove('show')
    momento.style.animation = ''
    const linha = document.getElementById('momento-linha')
    if (linha) linha.style.width = '0'
  }

  // Retoma exibição a partir do índice atual
  if (anunciosAtivos.length > 0 && telaAnuncios.style.display !== 'none') {
    exibirAnuncio()
  }
}

// ── Page Visibility API ───────────────────────────────────────
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    _pausarPlayer()
  } else {
    _retomarPlayer()
  }
})

// Solicita wake lock na inicialização (aba já está visível ao carregar)
if (!document.hidden) solicitarWakeLock()
