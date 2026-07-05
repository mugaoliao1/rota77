// ── Portal do Anunciante — helpers de estado das zonas (P1) ──
//
// P1: shell estático — sem Firebase. Estes helpers controlam os três
// estados visuais de cada zona (esqueleto / conteúdo / vazio) e serão
// consumidos pelas tarefas seguintes (P4+) quando os dados chegarem.
// Testáveis direto no console: uiZonaConteudo('zona-selo'), etc.

// Remove o efeito esqueleto de todos os elementos da zona — chamar
// quando o primeiro dado real chegar.
function uiZonaConteudo(zonaId) {
  const zona = document.getElementById(zonaId);
  if (!zona) return;
  zona.classList.remove('vazia');
  zona.querySelectorAll('.skel').forEach(el => el.classList.remove('skel'));
}

// Mostra o estado vazio da zona (mensagem definida no HTML) e esconde
// o conteúdo — usar para "entre anúncios", "nenhuma exibição hoje" etc.
function uiZonaVazia(zonaId) {
  const zona = document.getElementById(zonaId);
  if (!zona) return;
  zona.classList.add('vazia');
}

// Atualiza o selo (C1): estado ∈ 'verde' | 'ambar' | 'vermelho' | 'cinza'
function uiSelo(estado, titulo, subtitulo) {
  const dot = document.getElementById('selo-dot');
  const tEl = document.getElementById('selo-estado');
  const sEl = document.getElementById('selo-sub');
  if (!dot || !tEl || !sEl) return;
  dot.className = 'selo-dot' + (estado !== 'cinza' ? ' ' + estado : '');
  tEl.textContent = titulo;
  sEl.textContent = subtitulo || '';
  uiZonaConteudo('zona-selo');
}
