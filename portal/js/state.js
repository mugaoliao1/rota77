// ── Estado global do portal ───────────────────────────────────
let metricasCompletas = {};
let filtroAtivo = 'mes';
let diaSelecionado = null;
let dataInicioCustom = null, dataFimCustom = null;
let anuncianteAtual = null;
let aparicoesPorCorrida = 1;

function nomesBatem(nomeTablet, nomeCSV) {
  function norm(s) { return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim(); }
  const t = norm(nomeTablet);
  const c = norm(nomeCSV);
  if (!t || !c) return false;
  return c.includes(t) || t.includes(c);
}

const APARICOES_PLANO = { start: 1, movimento: 2, dominante: 4 };
