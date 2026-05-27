// ── Gerador de Boletim Diário ────────────────────────────────

let _boletimDados = null;

// ── Entry point ───────────────────────────────────────────────
function gerarBoletim() {
  if (!dadosImportados) {
    mostrarToast('❌ Carregue um CSV primeiro.', 'erro'); return;
  }
  if (!dadosImportados.todasCorridas || !dadosImportados.todasCorridas.length) {
    mostrarToast('❌ Re-importe o CSV — dados de cancelamento não disponíveis.', 'erro'); return;
  }

  const datas = Object.keys(dadosImportados.metricas).sort();
  const data  = datas[datas.length - 1]; // dia mais recente

  _boletimDados = calcularBoletim(dadosImportados.todasCorridas, data);

  // Preview no iframe
  const html = _construirHtmlBoletim(_boletimDados);
  const blob  = new Blob([html], { type: 'text/html;charset=utf-8' });
  const oldUrl = document.getElementById('boletim-iframe').src;
  document.getElementById('boletim-iframe').src = URL.createObjectURL(blob);
  if (oldUrl && oldUrl.startsWith('blob:')) URL.revokeObjectURL(oldUrl);

  document.getElementById('boletim-fechamento').value = _boletimDados.fechamento;
  document.getElementById('modal-boletim').classList.add('show');
}

// ── Publicar via GitHub API ───────────────────────────────────
async function publicarBoletim() {
  if (!_boletimDados) return;

  const msg  = document.getElementById('boletim-fechamento').value.trim() || _boletimDados.fechamento;
  const html = _construirHtmlBoletim(Object.assign({}, _boletimDados, { fechamento: msg }));

  const btn = document.getElementById('btn-publicar-boletim');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ Publicando...'; }

  try {
    const snap  = await db.ref('rotaads/config/githubToken').once('value');
    const token = snap.val();
    if (!token) {
      mostrarToast('❌ Token GitHub não configurado. Configure na seção Escala.', 'erro'); return;
    }

    const API = 'https://api.github.com/repos/mugaoliao1/rota77/contents/dist/boletim-atual.html';
    const hdrs = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' };

    const bytes = new TextEncoder().encode(html);
    let binary = '';
    bytes.forEach(function(b) { binary += String.fromCharCode(b); });
    const content = btoa(binary);

    let sha;
    const existing = await fetch(API, { headers: hdrs });
    if (existing.ok) sha = (await existing.json()).sha;

    const body = { message: 'boletim: ' + _boletimDados.dataFormatada, content: content };
    if (sha) body.sha = sha;

    const res = await fetch(API, {
      method: 'PUT',
      headers: Object.assign({}, hdrs, { 'Content-Type': 'application/json' }),
      body: JSON.stringify(body)
    });

    if (!res.ok) { const e = await res.json(); throw new Error(e.message || res.statusText); }

    mostrarToast('✅ Boletim publicado! Deploy em ~1 min', 'sucesso');
    fecharModal('modal-boletim');
  } catch(e) {
    console.error('[boletim/publicar]', e);
    mostrarToast('❌ ' + e.message, 'erro');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '🚀 Publicar Boletim'; }
  }
}

// ── Cálculo das métricas ──────────────────────────────────────
function calcularBoletim(todasCorridas, data) {
  const corridas     = todasCorridas.filter(function(r) { return r.data === data; });
  const finalizadas  = corridas.filter(function(r) { return r.statusNorm === 'finalizada'; });
  const canceladas   = corridas.filter(function(r) { return r.statusNorm.includes('cancelad'); });
  const naoAtendidas = corridas.filter(function(r) {
    return r.statusNorm.includes('não atendid') || r.statusNorm.includes('nao atendid') ||
           r.statusNorm.includes('expirad')     || r.statusNorm.includes('sem motorista');
  });
  const total = corridas.length || 1;

  // ── Rechamada: passageiro cancelou mas voltou e finalizou em até 2h ──
  const temPassageiro = canceladas.some(function(r) { return r.passageiro; });
  var cancelReais = canceladas;
  var rechamadas  = 0;
  if (temPassageiro) {
    cancelReais = canceladas.filter(function(c) {
      if (!c.passageiro) return true;
      const limite = c.momentoMs + 2 * 3600 * 1000;
      return !finalizadas.some(function(f) {
        return f.passageiro === c.passageiro && f.momentoMs > c.momentoMs && f.momentoMs <= limite;
      });
    });
    rechamadas = canceladas.length - cancelReais.length;
  }

  function pct(n) { return Math.round(n / total * 1000) / 10; }

  // ── Top motivos (cancelamentos reais) ──
  const motivosMap = {};
  cancelReais.forEach(function(r) {
    var m = (r.motivo || '').trim() || 'Outros';
    motivosMap[m] = (motivosMap[m] || 0) + 1;
  });
  const topMotivos = Object.entries(motivosMap)
    .sort(function(a, b) { return b[1] - a[1]; })
    .slice(0, 4)
    .map(function(entry) { return { motivo: entry[0], qtd: entry[1] }; });

  // ── Horários com mais cancelamentos reais ──
  const horasMap = {};
  cancelReais.forEach(function(r) { horasMap[r.hora] = (horasMap[r.hora] || 0) + 1; });
  const horariosCancel = Object.entries(horasMap)
    .sort(function(a, b) { return b[1] - a[1]; })
    .slice(0, 5)
    .map(function(entry, i) { return { hora: parseInt(entry[0]), qtd: entry[1], nivel: i < 2 ? 'alto' : 'medio' }; });

  // ── Top 3 motoristas por corridas finalizadas ──
  const motMap = {};
  finalizadas.forEach(function(r) {
    if (r.nomeMotorista) motMap[r.nomeMotorista] = (motMap[r.nomeMotorista] || 0) + 1;
  });
  const top3 = Object.entries(motMap)
    .sort(function(a, b) { return b[1] - a[1]; })
    .slice(0, 3)
    .map(function(entry) { return { nome: entry[0], corridas: entry[1] }; });

  // ── Destaque madrugada 00h–05h ──
  const madMap = {};
  finalizadas.filter(function(r) { return r.hora >= 0 && r.hora <= 4; })
    .forEach(function(r) { if (r.nomeMotorista) madMap[r.nomeMotorista] = (madMap[r.nomeMotorista] || 0) + 1; });
  const madSorted = Object.entries(madMap).sort(function(a, b) { return b[1] - a[1]; });
  const destMadrugada = madSorted.length ? { nome: madSorted[0][0], corridas: madSorted[0][1] } : null;

  // ── Destaque horário crítico 07h–10h e 16h–20h ──
  const criticoMap = {};
  finalizadas.filter(function(r) { return (r.hora >= 7 && r.hora <= 10) || (r.hora >= 16 && r.hora <= 20); })
    .forEach(function(r) { if (r.nomeMotorista) criticoMap[r.nomeMotorista] = (criticoMap[r.nomeMotorista] || 0) + 1; });
  const destCritico = Object.entries(criticoMap)
    .sort(function(a, b) { return b[1] - a[1]; })
    .slice(0, 2)
    .map(function(entry) { return { nome: entry[0], corridas: entry[1] }; });

  // ── Destaque constância: horas distintas ──
  const constMap = {};
  finalizadas.forEach(function(r) {
    if (!r.nomeMotorista) return;
    if (!constMap[r.nomeMotorista]) constMap[r.nomeMotorista] = new Set();
    constMap[r.nomeMotorista].add(r.hora);
  });
  const constSorted = Object.entries(constMap)
    .map(function(entry) { return { nome: entry[0], horas: entry[1].size }; })
    .sort(function(a, b) { return b.horas - a.horas; });

  const destConstancia = [];
  if (constSorted.length > 0) {
    destConstancia.push({ nomes: [constSorted[0].nome], horas: constSorted[0].horas });
    if (constSorted.length > 1) {
      const h2    = constSorted[1].horas;
      const tied2 = constSorted.slice(1).filter(function(x) { return x.horas === h2; }).map(function(x) { return x.nome; });
      destConstancia.push({ nomes: tied2, horas: h2 });
    }
  }

  // ── Formatação da data ──
  const MESES_LONG = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const DIAS_SEM   = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  const parts = data.split('-').map(Number);
  const y = parts[0], m = parts[1], d = parts[2];
  const dt = new Date(y, m - 1, d);

  return {
    data:             data,
    dataFormatada:    d + ' de ' + MESES_LONG[m - 1] + ' de ' + y,
    diaSemana:        DIAS_SEM[dt.getDay()],
    total:            corridas.length,
    finalizadas:      finalizadas.length,
    taxaFinalizacao:  pct(finalizadas.length),
    canceladas:       canceladas.length,
    cancelTotalPct:   pct(canceladas.length),
    cancelReais:      cancelReais.length,
    cancelReaisPct:   pct(cancelReais.length),
    naoAtendidas:     naoAtendidas.length,
    naoAtendidasPct:  pct(naoAtendidas.length),
    rechamadas:       rechamadas,
    temPassageiro:    temPassageiro,
    topMotivos:       topMotivos,
    horariosCancel:   horariosCancel,
    top3:             top3,
    destMadrugada:    destMadrugada,
    destCritico:      destCritico,
    destConstancia:   destConstancia,
    fechamento:       'Bom trabalho a todos! ✅'
  };
}

// ── Helpers HTML ──────────────────────────────────────────────
function _emojiMotivo(m) {
  var s = (m || '').toLowerCase();
  if (/espera|demora|tempo|atraso/.test(s))                   return '⏱️';
  if (/n.o entrou|n.o embarcou|passageiro n.o/.test(s))       return '🚪';
  if (/plano|mudan|desist|cancelei|arrependeu/.test(s))       return '📅';
  if (/endere.o|local|destino|rota|errou/.test(s))            return '📍';
  if (/pre.o|valor|taxa|cobran/.test(s))                      return '💰';
  if (/segur|peri|risco/.test(s))                             return '⚠️';
  return '📋';
}

function _fmtPct(n) { return n.toFixed(1).replace('.', ',') + '%'; }

function _motivosHtml(topMotivos) {
  if (!topMotivos.length) return '<div style="color:#888;font-size:12px;padding:8px 0;">Sem motivos registrados.</div>';
  return topMotivos.map(function(m, i) {
    return '<div class="cancel-row">' +
      '<div class="cancel-pos">' + (i + 1) + '</div>' +
      '<div class="cancel-motivo">' + _emojiMotivo(m.motivo) + ' ' + m.motivo + '</div>' +
      '<div class="cancel-qtd">' + m.qtd + '</div>' +
    '</div>';
  }).join('');
}

function _horasHtml(horariosCancel) {
  return horariosCancel.map(function(h) {
    return '<span class="horario-tag tag-' + h.nivel + '">' + h.hora + 'h — ' + h.qtd + '</span>';
  }).join('');
}

function _top3Html(top3) {
  var medalhas = ['🥇', '🥈', '🥉'];
  return top3.map(function(m, i) {
    return '<div class="top-item ' + (i === 0 ? 'primeiro' : '') + '">' +
      '<div class="top-emoji">' + medalhas[i] + '</div>' +
      '<div class="top-nome">' + m.nome + '</div>' +
      '<div class="top-num">' + m.corridas + '<small>corridas</small></div>' +
    '</div>';
  }).join('');
}

function _destaquesHtml(dados) {
  var html = '';

  if (dados.destMadrugada) {
    html += '<div class="destaque-item"><div class="destaque-icon">🌙</div><div>' +
      '<div class="destaque-tipo">Madrugada (00h–05h)</div>' +
      '<div class="destaque-nome">' + dados.destMadrugada.nome + '</div>' +
      '<div class="destaque-detalhe"><strong>' + dados.destMadrugada.corridas + ' corridas</strong> nas primeiras horas do dia</div>' +
    '</div></div>';
  }

  dados.destCritico.forEach(function(d) {
    html += '<div class="destaque-item"><div class="destaque-icon">⚡</div><div>' +
      '<div class="destaque-tipo">Horário Crítico (07h–10h e 16h–20h)</div>' +
      '<div class="destaque-nome">' + d.nome + '</div>' +
      '<div class="destaque-detalhe"><strong>' + d.corridas + ' corridas</strong> nos horários de pico</div>' +
    '</div></div>';
  });

  dados.destConstancia.forEach(function(d) {
    var sufixo = d.nomes.length > 1 ? ' cada' : ' com corridas finalizadas';
    html += '<div class="destaque-item"><div class="destaque-icon">🕐</div><div>' +
      '<div class="destaque-tipo">Constância — horas distintas</div>' +
      '<div class="destaque-nome">' + d.nomes.join(' · ') + '</div>' +
      '<div class="destaque-detalhe"><strong>' + d.horas + ' horas distintas</strong>' + sufixo + '</div>' +
    '</div></div>';
  });

  return html;
}

// ── Construtor do HTML completo ───────────────────────────────
function _construirHtmlBoletim(dados) {
  var rechamadasHtml = '';
  if (dados.temPassageiro) {
    rechamadasHtml = dados.rechamadas > 0
      ? '<div class="info-box"><strong>' + dados.rechamadas + ' passageiro' + (dados.rechamadas > 1 ? 's' : '') +
        '</strong> rechamou' + (dados.rechamadas > 1 ? 'aram' : '') + ' em até 2h e finalizou' + (dados.rechamadas > 1 ? 'aram' : '') + '.</div>'
      : '<div class="info-box">Nenhum passageiro rechamou em até 2h.</div>';
  }

  var css = `  :root {
    --azul: #1a2f5e;
    --azul-escuro: #111f3e;
    --amarelo: #F5A800;
    --verde: #27ae60;
    --vermelho: #e74c3c;
    --cinza: #f4f6f9;
    --cinza-texto: #666;
    --branco: #ffffff;
  }
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family:'Barlow', sans-serif;
    background:var(--azul-escuro);
    min-height:100vh;
    display:flex;
    align-items:flex-start;
    justify-content:center;
    padding:20px 16px;
  }
  .card {
    width:100%;
    max-width:420px;
    background:var(--branco);
    border-radius:20px;
    overflow:hidden;
    box-shadow:0 20px 60px rgba(0,0,0,0.4);
  }
  .header {
    background:var(--azul);
    padding:24px 24px 20px;
    position:relative;
    overflow:hidden;
  }
  .header::before {
    content:'';
    position:absolute;
    top:-50px; right:-50px;
    width:180px; height:180px;
    background:rgba(245,168,0,0.1);
    border-radius:50%;
  }
  .header-top {
    display:flex;
    align-items:center;
    justify-content:space-between;
    margin-bottom:16px;
    position:relative;
  }
  .logo-box {
    background:var(--amarelo);
    border-radius:8px;
    padding:6px 10px;
    font-family:'Barlow Condensed', sans-serif;
    font-size:13px;
    font-weight:900;
    color:var(--azul);
    line-height:1.1;
  }
  .data-pill {
    background:rgba(255,255,255,0.1);
    border:1px solid rgba(255,255,255,0.15);
    color:rgba(255,255,255,0.7);
    font-size:11px;
    font-weight:600;
    padding:4px 12px;
    border-radius:20px;
  }
  .header-titulo {
    font-family:'Barlow Condensed', sans-serif;
    font-size:13px;
    font-weight:700;
    letter-spacing:2px;
    text-transform:uppercase;
    color:var(--amarelo);
    margin-bottom:4px;
    position:relative;
  }
  .header-dia {
    font-family:'Barlow Condensed', sans-serif;
    font-size:28px;
    font-weight:900;
    color:var(--branco);
    line-height:1;
    position:relative;
  }
  .secao {
    padding:18px 20px;
    border-bottom:1px solid #eee;
  }
  .secao:last-child { border-bottom:none; }
  .secao-label {
    font-size:9px;
    font-weight:700;
    letter-spacing:2.5px;
    text-transform:uppercase;
    color:var(--amarelo);
    margin-bottom:12px;
  }
  .taxas-grid {
    display:grid;
    grid-template-columns:1fr 1fr;
    gap:10px;
  }
  .taxa-box {
    background:var(--cinza);
    border-radius:10px;
    padding:14px;
    text-align:center;
    border-left:4px solid var(--amarelo);
  }
  .taxa-box.verde { border-left-color:var(--verde); }
  .taxa-box.vermelho { border-left-color:var(--vermelho); }
  .taxa-label {
    font-size:10px;
    color:var(--cinza-texto);
    text-transform:uppercase;
    letter-spacing:1px;
    margin-bottom:5px;
  }
  .taxa-valor {
    font-family:'Barlow Condensed', sans-serif;
    font-size:34px;
    font-weight:900;
    line-height:1;
    color:var(--azul);
  }
  .taxa-valor.verde { color:var(--verde); }
  .taxa-valor.vermelho { color:var(--vermelho); }
  .taxa-sub {
    font-size:10px;
    color:var(--cinza-texto);
    margin-top:3px;
  }
  .info-box {
    background:#e8eef8;
    border-radius:8px;
    padding:10px 14px;
    font-size:12px;
    color:var(--azul);
    margin-top:12px;
  }
  .cancel-row {
    display:flex;
    align-items:center;
    gap:10px;
    padding:8px 0;
    border-bottom:1px solid #f0f0f0;
  }
  .cancel-row:last-child { border-bottom:none; }
  .cancel-pos {
    font-family:'Barlow Condensed', sans-serif;
    font-size:18px;
    font-weight:900;
    color:#ddd;
    width:20px;
    flex-shrink:0;
  }
  .cancel-motivo { flex:1; font-size:12px; color:#444; }
  .cancel-qtd {
    font-family:'Barlow Condensed', sans-serif;
    font-size:20px;
    font-weight:900;
    color:var(--amarelo);
  }
  .horarios-wrap {
    margin-top:10px;
    display:flex;
    gap:6px;
    flex-wrap:wrap;
  }
  .horario-tag {
    font-size:11px;
    font-weight:700;
    padding:4px 10px;
    border-radius:20px;
  }
  .tag-alto { background:#fdf0ef; color:var(--vermelho); }
  .tag-medio { background:#fff8e6; color:#b7800a; }
  .top-item {
    display:flex;
    align-items:center;
    gap:12px;
    padding:10px 14px;
    border-radius:10px;
    margin-bottom:6px;
    background:var(--cinza);
  }
  .top-item:last-child { margin-bottom:0; }
  .top-item.primeiro { background:#fff8e6; }
  .top-emoji { font-size:20px; flex-shrink:0; }
  .top-nome { flex:1; font-size:12px; font-weight:600; color:var(--azul); line-height:1.3; }
  .top-num {
    font-family:'Barlow Condensed', sans-serif;
    font-size:26px;
    font-weight:900;
    color:var(--azul);
    text-align:right;
  }
  .top-num small {
    display:block;
    font-size:9px;
    font-weight:400;
    color:var(--cinza-texto);
    line-height:1;
  }
  .destaque-item {
    display:flex;
    align-items:flex-start;
    gap:10px;
    padding:10px 0;
    border-bottom:1px solid #f0f0f0;
  }
  .destaque-item:last-child { border-bottom:none; }
  .destaque-icon { font-size:18px; flex-shrink:0; margin-top:1px; }
  .destaque-tipo {
    font-size:9px;
    font-weight:700;
    letter-spacing:1.5px;
    text-transform:uppercase;
    color:var(--cinza-texto);
    margin-bottom:3px;
  }
  .destaque-nome { font-size:13px; font-weight:700; color:var(--azul); margin-bottom:1px; }
  .destaque-detalhe { font-size:11px; color:var(--cinza-texto); }
  .destaque-detalhe strong { color:var(--azul); }
  .fechamento {
    background:var(--azul);
    padding:18px 20px;
    display:flex;
    align-items:center;
    gap:12px;
  }
  .fechamento-emoji { font-size:24px; flex-shrink:0; }
  .fechamento-texto { font-size:13px; color:rgba(255,255,255,0.8); line-height:1.5; }`;

  return '<!DOCTYPE html>\n<html lang="pt-BR">\n<head>\n' +
    '<meta charset="UTF-8">\n' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '<title>Boletim Diário — Rota 77</title>\n' +
    '<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;900&family=Barlow:wght@400;500;600;700&display=swap" rel="stylesheet">\n' +
    '<style>\n' + css + '\n</style>\n</head>\n<body>\n' +
    '<div class="card">\n' +

    '<!-- HEADER -->\n' +
    '<div class="header">\n' +
    '  <div class="header-top">\n' +
    '    <div class="logo-box">ROTA<br>77</div>\n' +
    '    <div class="data-pill">' + dados.dataFormatada + '</div>\n' +
    '  </div>\n' +
    '  <div class="header-titulo">Boletim Diário</div>\n' +
    '  <div class="header-dia">' + dados.diaSemana + '</div>\n' +
    '</div>\n' +

    '<!-- TAXAS -->\n' +
    '<div class="secao">\n' +
    '  <div class="secao-label">Resultado do Dia</div>\n' +
    '  <div class="taxas-grid">\n' +
    '    <div class="taxa-box verde">\n' +
    '      <div class="taxa-label">Taxa de finalização</div>\n' +
    '      <div class="taxa-valor verde">' + _fmtPct(dados.taxaFinalizacao) + '</div>\n' +
    '      <div class="taxa-sub">' + dados.finalizadas.toLocaleString('pt-BR') + ' corridas</div>\n' +
    '    </div>\n' +
    '    <div class="taxa-box verde">\n' +
    '      <div class="taxa-label">Cancel. real (2h)</div>\n' +
    '      <div class="taxa-valor verde">' + _fmtPct(dados.cancelReaisPct) + '</div>\n' +
    '      <div class="taxa-sub">' + dados.cancelReais + ' cancelamentos</div>\n' +
    '    </div>\n' +
    '    <div class="taxa-box vermelho">\n' +
    '      <div class="taxa-label">Cancel. total</div>\n' +
    '      <div class="taxa-valor vermelho">' + _fmtPct(dados.cancelTotalPct) + '</div>\n' +
    '      <div class="taxa-sub">' + dados.canceladas + ' corridas</div>\n' +
    '    </div>\n' +
    '    <div class="taxa-box">\n' +
    '      <div class="taxa-label">Não atendidas</div>\n' +
    '      <div class="taxa-valor">' + _fmtPct(dados.naoAtendidasPct) + '</div>\n' +
    '      <div class="taxa-sub">' + dados.naoAtendidas + ' chamadas</div>\n' +
    '    </div>\n' +
    '  </div>\n' +
    rechamadasHtml +
    '</div>\n' +

    '<!-- CANCELAMENTOS -->\n' +
    '<div class="secao">\n' +
    '  <div class="secao-label">Cancelamentos Reais — Top Motivos</div>\n' +
    _motivosHtml(dados.topMotivos) +
    (dados.horariosCancel.length ? (
      '  <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--cinza-texto);margin-top:12px;margin-bottom:6px;">Horários com mais cancelamentos</div>\n' +
      '  <div class="horarios-wrap">' + _horasHtml(dados.horariosCancel) + '</div>\n'
    ) : '') +
    '</div>\n' +

    '<!-- TOP 3 -->\n' +
    '<div class="secao">\n' +
    '  <div class="secao-label">Top 3 — Corridas Finalizadas</div>\n' +
    _top3Html(dados.top3) +
    '</div>\n' +

    '<!-- DESTAQUES -->\n' +
    '<div class="secao">\n' +
    '  <div class="secao-label">Destaques</div>\n' +
    _destaquesHtml(dados) +
    '</div>\n' +

    '<!-- FECHAMENTO -->\n' +
    '<div class="fechamento">\n' +
    '  <div class="fechamento-emoji">🚗</div>\n' +
    '  <div class="fechamento-texto">' + dados.fechamento + '</div>\n' +
    '</div>\n' +

    '</div>\n</body>\n</html>';
}

window.gerarBoletim    = gerarBoletim;
window.publicarBoletim = publicarBoletim;
