// ── UI: barra, fullscreen, pontinhos, QR, config ─────────────

// Barra inferior — auto-ocultar após 1.5 s
const barra       = document.querySelector('.barra');
const btFullscreen = document.getElementById('btn-fullscreen');
let timerBarra;

function esconderBarra() {
  barra.style.opacity        = '0';
  barra.style.transition     = 'opacity 0.8s';
  btFullscreen.style.opacity  = '0';
  btFullscreen.style.transition = 'opacity 0.8s';
}

function mostrarBarra() {
  barra.style.opacity        = '1';
  btFullscreen.style.opacity = '1';
  clearTimeout(timerBarra);
  timerBarra = setTimeout(esconderBarra, 1500);
}

function telaCheia() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(()=>{});
  else                             document.exitFullscreen().catch(()=>{});
}

// Pontinhos de navegação
const navDots = document.getElementById('nav-dots');

function atualizarPontinhos() {
  navDots.style.opacity = '0.5';
  clearTimeout(navDots._timer);
  navDots._timer = setTimeout(() => { navDots.style.opacity = '0'; }, 2000);
  if (!anunciosAtivos.length) { navDots.innerHTML = ''; return; }
  const total = anunciosAtivos.length, MAX_DOTS = 5;
  let inicio = Math.max(0, indiceAtual - Math.floor(MAX_DOTS / 2));
  let fim    = Math.min(total - 1, inicio + MAX_DOTS - 1);
  if (fim - inicio < MAX_DOTS - 1) inicio = Math.max(0, fim - MAX_DOTS + 1);
  let html = '';
  for (let i = inicio; i <= fim; i++) {
    const ativo = i === indiceAtual;
    html += `<div style="width:${ativo?'20px':'5px'};height:5px;border-radius:${ativo?'3px':'50%'};background:${ativo?'rgba(215,40,43,0.8)':'rgba(255,255,255,0.15)'};transition:all 0.5s cubic-bezier(0.34,1.56,0.64,1);box-shadow:${ativo?'0 0 8px rgba(215,40,43,0.4)':'none'};"></div>`;
  }
  navDots.innerHTML = html;
}

// QR Code
const qrWrap  = document.getElementById('qr-wrap');
const qrDiv   = document.getElementById('qr-code');
const qrLabel = document.getElementById('qr-label');

async function atualizarQR(link, cta, nomeAnuncio) {
  if (!link) {
    qrWrap.style.display = 'none';
    qrWrap.classList.remove('qr-pulsando');
    document.getElementById('qr-overlay').style.display = 'none';
    return;
  }
  qrLabel.textContent = cta || 'Saiba mais';
  const urlQR = `https://api.qrserver.com/v1/create-qr-code/?size=210x210&data=${encodeURIComponent(link)}&color=1a1a1a&bgcolor=ffffff&margin=8`;
  qrDiv.innerHTML = `<img src="${urlQR}" width="210" height="210" style="display:block;margin:0 auto;border-radius:8px;" />`;
  qrWrap.style.display = 'flex';
  qrWrap.classList.add('qr-pulsando');
  document.getElementById('qr-overlay').style.display = 'block';
  qrWrap.style.animation = 'none';
  setTimeout(() => { qrWrap.style.animation = ''; }, 10);
}

// Modal de configuração
function abrirConfig() {
  document.getElementById('config-tablet-id').value = tabletId;
  document.getElementById('config-status').textContent = tabletId
    ? `Tablet atual: ${tabletId}`
    : 'Nenhum tablet configurado';
  document.getElementById('tela-config').classList.add('show');
}

function fecharConfig() {
  document.getElementById('tela-config').classList.remove('show');
}

function salvarConfig() {
  const novoId = document.getElementById('config-tablet-id').value.trim();
  if (!novoId) {
    document.getElementById('config-status').textContent = 'Digite o ID do tablet.';
    return;
  }
  tabletId = novoId;
  localStorage.setItem('rotaads_tablet_id', tabletId);
  fecharConfig();
  telaLoading.style.display  = 'flex';
  telaAnuncios.style.display = 'none';
  telaOffline.classList.remove('show');
  anunciosAtivos = [];
  clearTimeout(timerExibicao);
  carregarAnuncios(); // definida em player.js, carregado depois
}
