// ── Player de anúncios, Momento MídiaCar, realtime listeners ─

let contadorAnuncios = 0;

const DADOS_URBANOS = [
  { icone:'📍', texto:'Sua marca circulando por Caçapava do Sul' },
  { icone:'🚗', texto:'Mídia urbana inteligente em movimento' },
  { icone:'📱', texto:'Escaneie o QR Code e saiba mais' },
  { icone:'🌆', texto:'Conectando marcas à cidade' },
  { icone:'⚡', texto:'Plataforma de mídia digital urbana' },
  { icone:'🎯', texto:'Sua marca no lugar certo, na hora certa' },
];
let indiceDadoUrbano = 0;

function iniciarExibicao() {
  telaLoading.style.display = 'none';
  telaOffline.classList.remove('show');
  telaAnuncios.style.display = 'flex';
  indiceAtual = 0;
  exibirAnuncio();
}

function exibirAnuncio() {
  if (!anunciosAtivos.length) { mostrarOffline(); return; }
  if (indiceAtual >= anunciosAtivos.length) indiceAtual = 0;
  const anuncio = anunciosAtivos[indiceAtual];
  const duracao = (anuncio.duracao || 15) * 1000;
  barraAnunciante.textContent = (anuncio._clima || anuncio._noticia) ? '' : (anuncio.nomeAnunciante || '');
  atualizarProgresso(); atualizarPontinhos();
  // Fade out suave antes de trocar
  anuncioImg.style.transition   = 'opacity 0.3s';
  anuncioVideo.style.transition = 'opacity 0.3s';
  anuncioImg.style.opacity      = '0';
  anuncioVideo.style.opacity    = '0';
  setTimeout(() => {
    anuncioImg.classList.remove('ativo');
    anuncioVideo.classList.remove('ativo');
    anuncioVideo.pause();
    anuncioVideo.removeAttribute('src');  // libera GPU memory do vídeo anterior
    anuncioVideo.load();
    anuncioImg.style.opacity   = '1';
    anuncioVideo.style.opacity = '1';
    if (anuncio._clima) {
      mostrarSlotClima(anuncio.climaDados);
      atualizarQR('', '', '');
      timerExibicao = setTimeout(proximoAnuncio, duracao); return;
    }
    if (anuncio._noticia) {
      mostrarSlotNoticia(anuncio.noticiaData);
      atualizarQR('', '', '');
      timerExibicao = setTimeout(proximoAnuncio, duracao); return;
    }
    document.getElementById('tela-clima').style.display = 'none';
    atualizarQR(anuncio.link || '', anuncio.cta || 'Saiba mais', anuncio.nome || '');
    if (anuncio.tipo === 'video') {
      anuncioVideo.src = anuncio.url;
      anuncioVideo.classList.add('ativo', 'fade');
      document.getElementById('tela-anuncios').classList.remove('vinheta-ativa');
      anuncioVideo.play().catch(() => {});
      anuncioVideo.onended = proximoAnuncio;
      timerExibicao = setTimeout(proximoAnuncio, duracao + 5000);
    } else {
      anuncioImg.src = anuncio.url;
      anuncioImg.classList.remove('ken-burns');
      void anuncioImg.offsetWidth; // reset animation
      anuncioImg.classList.add('ativo', 'fade', 'ken-burns');
      document.getElementById('tela-anuncios').classList.add('vinheta-ativa');
      timerExibicao = setTimeout(proximoAnuncio, duracao);
    }
    overlay.classList.remove('ativo');
  }, 280); // espera o overlay cobrir
}

// Contador para exibir Momento MídiaCar a cada 3 anúncios reais
function proximoAnuncio() {
  clearTimeout(timerExibicao);
  // Aplica atualização pendente do SW no momento mais seguro (entre anúncios)
  if (typeof _pendingSwUpdate !== 'undefined' && _pendingSwUpdate) { window.location.reload(); return; }
  const anuncioAtual  = anunciosAtivos[indiceAtual];
  const ehAnuncioReal = !anuncioAtual?._clima && !anuncioAtual?._noticia;
  indiceAtual = (indiceAtual + 1) % anunciosAtivos.length;
  if (ehAnuncioReal) contadorAnuncios++;
  if (contadorAnuncios >= 3) {
    contadorAnuncios = 0;
    mostrarMomento();
  } else {
    exibirAnuncio();
  }
}

function anuncioAnterior() {
  clearTimeout(timerExibicao);
  indiceAtual = (indiceAtual - 1 + anunciosAtivos.length) % anunciosAtivos.length;
  exibirAnuncio();
}

function mostrarMomento() {
  const el   = document.getElementById('momento-midiacar');
  const linha = document.getElementById('momento-linha');
  const agora = new Date();
  const hora  = String(agora.getHours()).padStart(2,'0') + ':' + String(agora.getMinutes()).padStart(2,'0');
  document.getElementById('momento-hora').textContent = hora;

  // qtdAnunciantes é mantido pelo listener em carregarAnuncios() — sem .once() aqui
  const dado = DADOS_URBANOS[indiceDadoUrbano % DADOS_URBANOS.length];
  indiceDadoUrbano++;
  document.getElementById('momento-dado-icone').textContent = dado.icone;
  document.getElementById('momento-dado-texto').textContent = dado.texto;

  el.classList.add('show');

  linha.style.transition = 'none';
  linha.style.width      = '0';
  timerMomento1 = setTimeout(() => {
    timerMomento1 = null;
    linha.style.transition = 'width 3s linear';
    linha.style.width      = '100%';
  }, 200);

  timerMomento2 = setTimeout(() => {
    timerMomento2 = null;
    el.style.animation = 'momentoSair 0.5s ease forwards';
    setTimeout(() => {
      el.classList.remove('show');
      el.style.animation = '';
      linha.style.width  = '0';
      exibirAnuncio();
    }, 500);
  }, 3500);
}

// ── Realtime listeners Firebase ───────────────────────────────
function carregarAnuncios() {
  // R11: filtra server-side pelo tablet atual (requer índice Firebase: rotaads/tablets/.indexOn: [nome])
  // Sem o índice: filtragem client-side — comportamento idêntico ao anterior, sem regressão
  fbOn(db.ref('rotaads/tablets').orderByChild('nome').equalTo(tabletId), 'value', snap => {
    online = true; atualizarStatusDot(true);
    if (!snap.val()) { mostrarOffline(); return; }
    const tablet = Object.values(snap.val())[0];
    if (!tablet || tablet.status !== 'ativo' || !tablet.anuncios) { mostrarOffline(); return; }
    const anuncioIds = Object.keys(tablet.anuncios);
    if (!anuncioIds.length) { mostrarOffline(); return; }
    // R6: falha individual não derruba o lote — retorna null e é filtrado abaixo
    const promessas = anuncioIds.map(id =>
      db.ref(`rotaads/anuncios/${id}`).once('value')
        .then(s => s.val() ? { id, ...s.val() } : null)
        .catch(() => null)
    );
    Promise.all(promessas).then(async resultados => {
      const novosAnuncios = resultados.filter(a => a && a.status === 'ativo' && a.url);
      if (!novosAnuncios.length) { mostrarOffline(); return; }
      anunciosAtivos = await inserirSlotClima(novosAnuncios);
      novosAnuncios.forEach(a => { if (a.tipo !== 'video') { const img = new Image(); img.src = a.url; } });
      if (telaAnuncios.style.display === 'none') iniciarExibicao();
    });
  }, () => {
    online = false; atualizarStatusDot(false);
    if (!anunciosAtivos.length) mostrarOffline();
  });

  fbOn(db.ref('.info/connected'), 'value', snap => {
    online = snap.val() === true;
    atualizarStatusDot(online);
  });

  // R4: substitui .once() chamado a cada Momento — 1 listener persistente em vez de ~1920 calls/24h
  fbOn(db.ref('rotaads/anunciantes'), 'value', snap => {
    qtdAnunciantes = snap.val() ? Object.keys(snap.val()).length : 0;
    if (qtdAnunciantes > 0) {
      DADOS_URBANOS[0] = { icone:'🏪', texto:`${qtdAnunciantes} anunciante${qtdAnunciantes>1?'s':''} ativo${qtdAnunciantes>1?'s':''} na plataforma` };
    }
  });
}
