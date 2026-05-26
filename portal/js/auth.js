// ── Login, abertura do portal e logout ────────────────────────
async function entrar() {
  const user = document.getElementById('login-user').value.trim().toLowerCase();
  const pass = document.getElementById('login-pass').value.trim();
  if (!user || !pass) { mostrarErroLogin(); return; }
  try {
    const snap = await db.ref('rotaads/anunciantes').once('value');
    const anunciantes = snap.val() || {};
    let encontrado = null;
    Object.entries(anunciantes).forEach(([id,a]) => {
      const nomeSimples = (a.nome||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/\s+/g,'').substring(0,8);
      const senhaWpp = (a.whatsapp||'').replace(/\D/g,'').slice(-6);
      if (user===nomeSimples && pass===senhaWpp) encontrado={id,...a};
      if (a.usuario && a.senha && user===a.usuario.toLowerCase() && pass===a.senha) encontrado={id,...a};
    });
    if (!encontrado) { mostrarErroLogin(); return; }
    anuncianteAtual = encontrado;

    const campSnap = await db.ref('rotaads/campanhas').once('value');
    const todasCamp = campSnap.val() || {};
    const todasLista = Object.values(todasCamp).filter(c=>c);
    let campAtiva = todasLista.find(c =>
      (c.anunciante === encontrado.id || c.anuncianteId === encontrado.id) &&
      (c.status === 'Ativa' || c.status === 'ativa')
    ) || todasLista.find(c =>
      c.anunciante === encontrado.id || c.anuncianteId === encontrado.id
    );
    if (!campAtiva) {
      const porNome = todasLista.filter(c => {
        const nomeAnunc = anunciantes[c.anunciante]?.nome || '';
        return nomeAnunc.toLowerCase() === (encontrado.nome||'').toLowerCase();
      });
      if (porNome.length) campAtiva = porNome.find(c=>c.status==='Ativa'||c.status==='ativa') || porNome[0];
    }
    if (campAtiva && campAtiva.plano) {
      const planoKey = campAtiva.plano.toLowerCase();
      aparicoesPorCorrida = APARICOES_PLANO[planoKey] || campAtiva.aparicoes || 1;
      anuncianteAtual.plano = campAtiva.plano;
      anuncianteAtual.aparicoes = aparicoesPorCorrida;
      anuncianteAtual.inicio = campAtiva.inicio || anuncianteAtual.inicio;
      anuncianteAtual.fim = campAtiva.fim || anuncianteAtual.fim;
      anuncianteAtual.temAdesivo = (campAtiva.adesivos||0) > 0;
      anuncianteAtual.qtdAdesivos = campAtiva.adesivos || 0;
    }

    abrirPortal(anuncianteAtual);
  } catch(e) { console.error(e); mostrarErroLogin(); }
}

function mostrarErroLogin() { document.getElementById('erro-login').style.display='block'; }

function abrirPortal(a) {
  document.getElementById('tela-login').style.display='none';
  document.getElementById('portal').style.display='block';
  document.getElementById('topbar-empresa').textContent = a.nome;
  document.getElementById('camp-empresa').textContent = a.nome;
  document.getElementById('camp-periodo').textContent = `${a.inicio||'—'} a ${a.fim||'—'}`;

  const badgePlano = document.getElementById('badge-plano');
  if (badgePlano && a.plano) {
    badgePlano.textContent = `PLANO ${(a.plano||'').toUpperCase()} · ${aparicoesPorCorrida} APARICAO${aparicoesPorCorrida>1?'ES':''}/CICLO`;
    badgePlano.style.display = 'inline-flex';
  }

  const infoBox = document.getElementById('info-calculo');
  if (infoBox) {
    infoBox.innerHTML = `<strong>Como calculamos:</strong> Impressões = corridas × ${aparicoesPorCorrida} aparição${aparicoesPorCorrida>1?'ções':''}/ciclo (Plano ${a.plano||'—'}). Km = distância real de cada corrida conforme relatório.`;
  }

  ['kpi-impressoes','kpi-corridas','kpi-km','kpi-dias'].forEach(id => {
    document.getElementById(id).textContent = '...';
  });

  document.getElementById('tabela-motoristas').innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--cinza4);padding:20px;">Carregando motoristas...</td></tr>`;

  carregarAnuncios(a.id);

  fbOn(db.ref('rotaads/metricas'), 'value', snap => {
    metricasCompletas = snap.val() || {};
    atualizarPortal();
  });
}

function sair() {
  fbOffTodos()  // remove listeners Firebase antes de limpar UI
  document.getElementById('portal').style.display='none';
  document.getElementById('tela-login').style.display='flex';
  document.getElementById('login-user').value='';
  document.getElementById('login-pass').value='';
  document.getElementById('erro-login').style.display='none';
  anuncianteAtual = null;
}
