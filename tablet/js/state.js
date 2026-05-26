// ── Estado global do tablet ───────────────────────────────────
let tabletId        = localStorage.getItem('rotaads_tablet_id') || '';
let anunciosAtivos  = [];
let indiceAtual     = 0;
let timerExibicao   = null;
let timerMomento1   = null;  // barra de progresso do Momento MídiaCar
let timerMomento2   = null;  // saída do Momento + chamada exibirAnuncio
let online          = false;
let qtdAnunciantes  = 0;     // R4: mantido em memória pelo listener de rotaads/anunciantes

// ── Referências DOM usadas por múltiplos módulos ──────────────
const telaLoading    = document.getElementById('tela-loading');
const telaOffline    = document.getElementById('tela-offline');
const telaAnuncios   = document.getElementById('tela-anuncios');
const anuncioImg     = document.getElementById('anuncio-img');
const anuncioVideo   = document.getElementById('anuncio-video');
const barraAnunciante = document.getElementById('barra-anunciante');
const barraProgresso  = document.getElementById('barra-progresso');
const statusDot      = document.getElementById('status-dot');
const overlay        = document.getElementById('transition-overlay');
