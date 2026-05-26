// ── Relatório: filtros, gráfico, KPIs, tabela de motoristas ───
function trocarAba(id, btn) {
  document.querySelectorAll('.aba-btn').forEach(b=>b.classList.remove('ativo'));
  document.querySelectorAll('.aba-conteudo').forEach(c=>c.classList.remove('ativo'));
  btn.classList.add('ativo');
  document.getElementById('aba-'+id).classList.add('ativo');
  if (id === 'anuncios' && anuncianteAtual) {
    carregarAnuncios(anuncianteAtual.id);
  }
}

function getDatasNoFiltro() {
  const todas = Object.keys(metricasCompletas).sort();
  if (!todas.length) return [];

  if (diaSelecionado) return todas.filter(d => d === diaSelecionado);

  const ultimaData = todas[todas.length - 1];
  const ultimaDate = new Date(ultimaData + 'T12:00:00');

  if (filtroAtivo === '7d') {
    const lim = new Date(ultimaDate);
    lim.setDate(lim.getDate() - 6);
    const limStr = lim.toISOString().substring(0, 10);
    return todas.filter(d => d >= limStr);

  } else if (filtroAtivo === 'mes') {
    const mesAlvo = ultimaData.substring(0, 7);
    return todas.filter(d => d.startsWith(mesAlvo));

  } else if (filtroAtivo === 'custom' && dataInicioCustom && dataFimCustom) {
    function normalizar(dt) {
      if (!dt) return '';
      if (dt.includes('/')) {
        const p = dt.split('/');
        if (p.length === 3) return `${p[2]}-${p[1].padStart(2,'0')}-${p[0].padStart(2,'0')}`;
      }
      return dt;
    }
    const inicio = normalizar(dataInicioCustom);
    const fim = normalizar(dataFimCustom);
    return todas.filter(d => d >= inicio && d <= fim);
  }

  return todas;
}

function atualizarPortal() {
  const datas = getDatasNoFiltro();
  if (!datas.length) return;

  db.ref('rotaads/tablets').once('value', snapTablets => {
    const tabletsData = snapTablets.val() || {};
    const nomesTabletKPI = Object.values(tabletsData)
      .filter(t => t && t.status !== 'inativo')
      .map(t => (t.motorista||'').trim())
      .filter(Boolean);

    db.ref('rotaads/metricasMotoristas').once('value', snap => {
      const dadosPorData = snap.val() || {};
      let cor = 0, km = 0;
      let usouFiltro = false;

      if (nomesTabletKPI.length > 0) {
        datas.forEach(data => {
          const motNaData = dadosPorData[data] || {};
          Object.values(motNaData).forEach(m => {
            if (nomesTabletKPI.some(nt => nomesBatem(nt, m.nome))) {
              cor += m.corridas || 0;
              km += m.km || 0;
              usouFiltro = true;
            }
          });
        });
      }

      if (!usouFiltro) {
        datas.forEach(d => { const dia = metricasCompletas[d]; if(dia){ cor += dia.corridas||0; km += dia.km||0; } });
      }

      const imp = cor * aparicoesPorCorrida;
      animarValor('kpi-impressoes', imp);
      animarValor('kpi-corridas', cor);
      animarValor('kpi-km', Math.round(km));
      document.getElementById('kpi-dias').textContent = datas.length;

      db.ref('rotaads/scans').once('value', snapScans => {
        const todosScans = snapScans.val() || {};
        db.ref('rotaads/campanhas').once('value', snapC => {
          const todasCamp = snapC.val() || {};
          const campIds = Object.entries(todasCamp)
            .filter(([,c]) => c && (c.anunciante === anuncianteAtual?.id || c.anuncianteId === anuncianteAtual?.id))
            .map(([id]) => id);
          db.ref('rotaads/anuncios').once('value', snapA => {
            const todosAnuncios = snapA.val() || {};
            const anuncioIds = Object.keys(todosAnuncios).filter(aid => campIds.includes(todosAnuncios[aid]?.campanha));
            let totalScans = 0;
            anuncioIds.forEach(aid => {
              const scansAnuncio = todosScans[aid] || {};
              datas.forEach(data => { totalScans += scansAnuncio[data] || 0; });
            });
            animarValor('kpi-scans', totalScans);
          });
        });
      });

      const cardAdesivo = document.getElementById('card-adesivo');
      if (anuncianteAtual?.temAdesivo) {
        db.ref('rotaads/tablets').once('value', snapAd => {
          const tbAd = snapAd.val() || {};
          const motoristasComAdesivo = Object.values(tbAd)
            .filter(t => t && t.adesivo === true && t.status !== 'inativo')
            .map(t => (t.motorista||'').trim())
            .filter(Boolean);

          if (!motoristasComAdesivo.length) {
            cardAdesivo.style.display = 'none';
            return;
          }

          let kmAdesivo = 0;
          datas.forEach(data => {
            const motNaData = dadosPorData[data] || {};
            Object.values(motNaData).forEach(m => {
              if (motoristasComAdesivo.some(nt => nomesBatem(nt, m.nome))) {
                kmAdesivo += m.km || 0;
              }
            });
          });

          const IMPACTOS_POR_KM = 20;
          const alcance = Math.round(kmAdesivo * IMPACTOS_POR_KM);
          document.getElementById('adesivo-alcance').textContent = alcance.toLocaleString('pt-BR');
          document.getElementById('adesivo-km').textContent = Math.round(kmAdesivo).toLocaleString('pt-BR') + ' km';
          document.getElementById('adesivo-formula').textContent = `pessoas impactadas estimadas (${motoristasComAdesivo.length} carro${motoristasComAdesivo.length>1?'s':''} com adesivo)`;
          cardAdesivo.style.display = 'block';
        });
      } else {
        cardAdesivo.style.display = 'none';
      }

      const projecaoEl = document.getElementById('kpi-projecao');
      if (datas.length > 0 && !diaSelecionado) {
        const todasDoMes = Object.keys(metricasCompletas).filter(d => d.startsWith(datas[0].substring(0,7))).sort();
        const diasNoMes = new Date(parseInt(datas[0].substring(0,4)), parseInt(datas[0].substring(5,7)), 0).getDate();
        const diasPassados = todasDoMes.length;
        if (diasPassados > 0 && imp > 0) {
          const mediaDiaria = imp / diasPassados;
          const projecao = Math.round(mediaDiaria * diasNoMes);
          projecaoEl.textContent = projecao.toLocaleString('pt-BR');
          projecaoEl.title = `Baseado em ${diasPassados} dias — média de ${Math.round(mediaDiaria).toLocaleString('pt-BR')} imp/dia`;
        } else {
          projecaoEl.textContent = '—';
        }
      } else {
        projecaoEl.textContent = '—';
      }

      if (filtroAtivo === 'mes' && datas.length) {
        const mes = datas[0].substring(0, 7);
        const [ano, m] = mes.split('-');
        const nomes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        const btnMes = document.querySelector('.fbtn[onclick*="mes"]');
        if (btnMes) btnMes.textContent = `${nomes[parseInt(m)-1]}/${ano}`;
      }

      atualizarGrafico(datas, dadosPorData, nomesTabletKPI);
      atualizarTabelaMotoristas(datas);
    });
  });
}

function atualizarTabelaMotoristas(datas) {
  const tbody = document.getElementById('tabela-motoristas');

  db.ref('rotaads/tablets').once('value', snapTablets => {
    const tabletsData = snapTablets.val() || {};
    const nomesTablet = Object.values(tabletsData)
      .filter(t => t && t.status !== 'inativo')
      .map(t => (t.motorista||'').trim())
      .filter(Boolean);

    db.ref('rotaads/metricasMotoristas').once('value', snap => {
      const dadosPorData = snap.val() || {};
      const agregado = {};

      datas.forEach(data => {
        const motNaData = dadosPorData[data] || {};
        Object.entries(motNaData).forEach(([key, m]) => {
          if (!agregado[key]) agregado[key] = { nome: m.nome, corridas: 0, km: 0 };
          agregado[key].corridas += m.corridas || 0;
          agregado[key].km += m.km || 0;
        });
      });

      let lista = Object.values(agregado).sort((a,b) => b.corridas - a.corridas);
      if (nomesTablet.length > 0) {
        const comTablet = lista.filter(m => nomesTablet.some(nt => nomesBatem(nt, m.nome)));
        if (comTablet.length > 0) lista = comTablet;
      }
      lista = lista.slice(0, 10);

      if (!lista.length) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--cinza4);padding:20px;">Nenhum dado de motorista para o período selecionado.<br><span style="font-size:11px;">Reimporte o CSV no painel de gestão para atualizar.</span></td></tr>`;
        return;
      }

      tbody.innerHTML = lista.map((m, i) => {
        const imp = Math.round(m.corridas * aparicoesPorCorrida);
        return `<tr>
          <td class="rank">${i+1}</td>
          <td>${m.nome}</td>
          <td>${m.corridas.toLocaleString('pt-BR')}</td>
          <td class="imp-val">${imp.toLocaleString('pt-BR')}</td>
          <td>${Math.round(m.km).toLocaleString('pt-BR')} km</td>
        </tr>`;
      }).join('');
    });
  });
}

function animarValor(id, alvo) {
  const el = document.getElementById(id);
  const atual = parseInt(el.textContent.replace(/\D/g,''))||0;
  const diff = alvo - atual;
  const steps = 20;
  let i=0;
  const timer = setInterval(()=>{
    i++;
    const val = Math.round(atual + diff*(i/steps));
    el.textContent = val.toLocaleString('pt-BR');
    if (i>=steps) clearInterval(timer);
  },16);
}

function atualizarGrafico(datas, dadosPorData, nomesTablet) {
  const g = document.getElementById('grafico');
  if (!g) return;
  const vals = datas.map(d => {
    const motNaData = dadosPorData[d] || {};
    let cor = 0;
    let bateu = false;
    if (nomesTablet && nomesTablet.length > 0) {
      Object.values(motNaData).forEach(m => {
        if (nomesTablet.some(nt => nomesBatem(nt, m.nome))) { cor += m.corridas||0; bateu = true; }
      });
    }
    if (!bateu) Object.values(motNaData).forEach(m => { cor += m.corridas||0; });
    return cor * aparicoesPorCorrida;
  });
  const max = Math.max(...vals, 1);
  const altura = 104;
  let dt = datas, vt = vals;
  if (datas.length > 30) {
    const step = Math.ceil(datas.length/30);
    dt = datas.filter((_,i) => i%step===0);
    vt = dt.map((_,i) => vals[i*step] || 0);
  }
  g.innerHTML = dt.map((d,i) => {
    const h = Math.max(2, Math.round((vt[i]/max)*altura));
    const dia = d.substring(8);
    return `<div class="g-col"><div class="g-barra" style="height:${h}px" onclick="selecionarDia('${d}',this)"><div class="g-tooltip">${d}: ${vt[i].toLocaleString('pt-BR')} imp.</div></div><div class="g-label">${dia}</div></div>`;
  }).join('');
}

function renderizarGrafico(datas) {
  const g = document.getElementById('grafico');
  const vals = datas.map(d=>(metricasCompletas[d]?.corridas||0) * aparicoesPorCorrida);
  const max = Math.max(...vals);
  const altura = 104;
  let dt = datas, vt = vals;
  if (datas.length>30) {
    const step=Math.ceil(datas.length/30);
    dt=datas.filter((_,i)=>i%step===0);
    vt=dt.map(d=>(metricasCompletas[d]?.corridas||0) * aparicoesPorCorrida);
  }
  g.innerHTML = dt.map((d,i)=>{
    const h = max>0 ? Math.max(2,Math.round((vt[i]/max)*altura)) : 2;
    const dia = d.substring(8);
    return `<div class="g-col"><div class="g-barra" style="height:${h}px"><div class="g-tooltip">${d}: ${vt[i].toLocaleString('pt-BR')} imp.</div></div><div class="g-label">${dia}</div></div>`;
  }).join('');
}

function selecionarDia(data, barraEl) {
  diaSelecionado = data;
  document.querySelectorAll('.g-barra').forEach(b => b.classList.remove('selecionada'));
  document.querySelectorAll('.g-label').forEach(l => l.classList.remove('selecionada'));
  if (barraEl) {
    barraEl.classList.add('selecionada');
    barraEl.nextElementSibling?.classList.add('selecionada');
  }
  document.getElementById('btn-dia-selecionado').style.display = 'inline-flex';
  document.getElementById('btn-dia-selecionado').textContent = `✕ ${data.substring(8)}/${data.substring(5,7)}`;
  atualizarPortal();
}

function limparDiaSelecionado() {
  diaSelecionado = null;
  document.querySelectorAll('.g-barra').forEach(b => b.classList.remove('selecionada'));
  document.querySelectorAll('.g-label').forEach(l => l.classList.remove('selecionada'));
  document.getElementById('btn-dia-selecionado').style.display = 'none';
  atualizarPortal();
}

function setFiltro(tipo, btn) {
  diaSelecionado = null;
  document.getElementById('btn-dia-selecionado').style.display = 'none';
  filtroAtivo = tipo;
  document.querySelectorAll('.fbtn').forEach(b=>b.classList.remove('ativo'));
  btn.classList.add('ativo');
  document.getElementById('filtro-datas').style.display = tipo==='custom'?'flex':'none';
  if (tipo!=='custom') atualizarPortal();
}

function aplicarCustom() {
  dataInicioCustom = document.getElementById('data-inicio').value;
  dataFimCustom = document.getElementById('data-fim').value;
  if (dataInicioCustom && dataFimCustom) {
    if (dataInicioCustom > dataFimCustom) {
      mostrarToast('⚠️ Data inicial maior que a final','erro');
      return;
    }
    atualizarPortal();
  }
}
