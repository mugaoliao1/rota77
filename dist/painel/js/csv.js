// ── Importação de CSV e histórico de importações ─────────────
let dadosImportados = null;

function onDrop(event) {
  event.preventDefault();
  document.getElementById('drop-zone').style.borderColor = 'var(--cinza2)';
  const file = event.dataTransfer.files[0];
  if (file && file.name.endsWith('.csv')) processarCSV(file);
  else mostrarToast('⚠️ Selecione um arquivo .csv','erro');
}

function processarCSV(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const texto = e.target.result;
      const resultado = parsearCSV(texto);
      const { metricas, motoristas, metricasPorMotorista } = resultado;
      if (!metricas || Object.keys(metricas).length === 0) {
        mostrarToast('⚠️ Nenhuma corrida finalizada encontrada no arquivo','erro');
        return;
      }
      dadosImportados = { metricas, motoristas, metricasPorMotorista, arquivo: file.name, timestamp: new Date().toISOString() };
      mostrarPreview(metricas, motoristas);
      mostrarToast('✅ Arquivo lido com sucesso! Confira e salve.','sucesso');
    } catch(err) {
      console.error(err);
      mostrarToast('❌ Erro ao processar o arquivo: '+err.message,'erro');
    }
  };
  reader.readAsText(file, 'latin1');
}

function parsearCSV(texto) {
  const linhas = texto.split('\n');
  if (linhas.length < 2) throw new Error('Arquivo vazio');

  const sep = linhas[0].includes(';') ? ';' : ',';
  const headers = linhas[0].split(sep).map(h => h.trim().replace(/"/g,''));

  const idxStatus    = headers.findIndex(h => h.toLowerCase().includes('status'));
  const idxMomento   = headers.findIndex(h => h.toLowerCase().includes('momento da solicita'));
  const idxDistancia = headers.findIndex(h => h.toLowerCase().includes('distância do início') || h.toLowerCase().includes('distancia do inicio'));
  const idxTempo     = headers.findIndex(h => h.toLowerCase().includes('tempo do início') || h.toLowerCase().includes('tempo do inicio'));
  const idxMotorista = headers.findIndex(h => h.toLowerCase() === 'motorista');

  console.log('Colunas detectadas:', {idxStatus, idxMomento, idxDistancia, idxTempo, idxMotorista});

  const metricas = {};
  const motoristas = {};
  const metricasPorMotorista = {};

  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (!linha) continue;
    const cols = linha.split(sep);

    const status = (cols[idxStatus]||'').trim().toLowerCase();
    if (status !== 'finalizada') continue;

    const momentoRaw = (cols[idxMomento]||'').trim().replace(/"/g,'');
    if (!momentoRaw) continue;

    const partes = momentoRaw.split(' ')[0].split('/');
    if (partes.length < 3) continue;
    const data = `${partes[2]}-${partes[1].padStart(2,'0')}-${partes[0].padStart(2,'0')}`;

    let km = 0;
    if (idxDistancia >= 0) {
      km = parseFloat((cols[idxDistancia]||'0').replace(',','.').trim()) || 0;
    }

    let tempo = 0;
    if (idxTempo >= 0) {
      tempo = parseFloat((cols[idxTempo]||'0').replace(',','.').trim()) || 0;
    }

    const nomeMotorista = idxMotorista >= 0 ? (cols[idxMotorista]||'').trim().replace(/"/g,'') : '';

    if (!metricas[data]) metricas[data] = { corridas:0, km:0, tempo_min:0 };
    metricas[data].corridas++;
    metricas[data].km = Math.round((metricas[data].km + km) * 1000) / 1000;
    metricas[data].tempo_min += tempo;

    if (nomeMotorista) {
      if (!motoristas[nomeMotorista]) motoristas[nomeMotorista] = { corridas:0, km:0 };
      motoristas[nomeMotorista].corridas++;
      motoristas[nomeMotorista].km = Math.round((motoristas[nomeMotorista].km + km) * 1000) / 1000;

      if (!metricasPorMotorista[data]) metricasPorMotorista[data] = {};
      if (!metricasPorMotorista[data][nomeMotorista]) metricasPorMotorista[data][nomeMotorista] = { corridas:0, km:0 };
      metricasPorMotorista[data][nomeMotorista].corridas++;
      metricasPorMotorista[data][nomeMotorista].km = Math.round((metricasPorMotorista[data][nomeMotorista].km + km) * 1000) / 1000;
    }
  }

  Object.keys(metricas).forEach(data => {
    metricas[data].km = Math.round(metricas[data].km * 10) / 10;
    metricas[data].tempo_min = Math.round(metricas[data].tempo_min);
  });
  Object.keys(motoristas).forEach(nome => {
    motoristas[nome].km = Math.round(motoristas[nome].km * 10) / 10;
  });

  return { metricas, motoristas, metricasPorMotorista };
}

function mostrarPreview(metricas, motoristas) {
  const datas = Object.keys(metricas).sort();
  let totalCorridas=0, totalKm=0;
  datas.forEach(d => {
    totalCorridas += metricas[d].corridas;
    totalKm       += metricas[d].km;
  });
  const totalMotoristas = Object.keys(motoristas||{}).length;

  document.getElementById('preview-kpis').innerHTML = `
    <div style="background:var(--preto3);border-radius:10px;padding:16px;border:1px solid var(--cinza1);">
      <div style="font-size:22px;font-weight:900;color:var(--branco);">${datas.length}</div>
      <div style="font-size:10px;color:var(--cinza4);text-transform:uppercase;letter-spacing:1px;">Dias no arquivo</div>
    </div>
    <div style="background:var(--preto3);border-radius:10px;padding:16px;border:1px solid var(--cinza1);">
      <div style="font-size:22px;font-weight:900;color:var(--branco);">${totalCorridas.toLocaleString('pt-BR')}</div>
      <div style="font-size:10px;color:var(--cinza4);text-transform:uppercase;letter-spacing:1px;">Corridas</div>
    </div>
    <div style="background:var(--preto3);border-radius:10px;padding:16px;border:1px solid var(--cinza1);">
      <div style="font-size:22px;font-weight:900;color:var(--vm);">${totalMotoristas}</div>
      <div style="font-size:10px;color:var(--cinza4);text-transform:uppercase;letter-spacing:1px;">Motoristas</div>
    </div>
    <div style="background:var(--preto3);border-radius:10px;padding:16px;border:1px solid var(--cinza1);">
      <div style="font-size:22px;font-weight:900;color:var(--branco);">${Math.round(totalKm).toLocaleString('pt-BR')} km</div>
      <div style="font-size:10px;color:var(--cinza4);text-transform:uppercase;letter-spacing:1px;">Km rodados</div>
    </div>
  `;

  document.getElementById('preview-datas').innerHTML = datas.map(d => {
    const m = metricas[d];
    return `<span style="background:var(--preto3);border:1px solid var(--cinza1);border-radius:6px;padding:4px 10px;font-size:11px;font-weight:600;">
      ${d} <span style="color:var(--vm);">${m.corridas} corridas</span>
    </span>`;
  }).join('');

  document.getElementById('card-preview').style.display = 'block';
  document.getElementById('card-preview').scrollIntoView({behavior:'smooth'});
}

async function salvarMetricas() {
  if (!dadosImportados) return;
  const { metricas, motoristas, metricasPorMotorista, arquivo, timestamp } = dadosImportados;

  try {
    const updates = {};

    Object.entries(metricas).forEach(([data, m]) => {
      updates[`rotaads/metricas/${data}`] = m;
    });

    if (motoristas) {
      Object.entries(motoristas).forEach(([nome, m]) => {
        const key = nome.normalize('NFD').replace(/[̀-ͯ]/g,'')
          .replace(/[^a-zA-Z0-9 ]/g,'').replace(/\s+/g,'_').substring(0,40);
        updates[`rotaads/motoristas/${key}`] = { nome, corridas: m.corridas, km: m.km };
      });
    }

    if (metricasPorMotorista) {
      Object.entries(metricasPorMotorista).forEach(([data, motDict]) => {
        Object.entries(motDict).forEach(([nome, m]) => {
          const key = nome.normalize('NFD').replace(/[̀-ͯ]/g,'')
            .replace(/[^a-zA-Z0-9 ]/g,'').replace(/\s+/g,'_').substring(0,40);
          updates[`rotaads/metricasMotoristas/${data}/${key}`] = { nome, corridas: m.corridas, km: m.km };
        });
      });
    }

    await db.ref().update(updates);

    const datas = Object.keys(metricas).sort();
    const totalCorridas = Object.values(metricas).reduce((a,m)=>a+m.corridas,0);
    const totalKm       = Object.values(metricas).reduce((a,m)=>a+m.km,0);
    const totalMotoristas = Object.keys(motoristas||{}).length;

    await db.ref('rotaads/importacoes').push({
      arquivo, timestamp,
      periodo: `${datas[0]} a ${datas[datas.length-1]}`,
      corridas: totalCorridas,
      km: Math.round(totalKm),
      motoristas: totalMotoristas,
      status: 'ok'
    });

    dadosImportados = null;
    document.getElementById('card-preview').style.display = 'none';
    document.getElementById('csv-input').value = '';
    mostrarToast(`✅ ${Object.keys(metricas).length} dias e ${totalMotoristas} motoristas salvos!`, 'sucesso');
    carregarHistoricoImportacoes();
  } catch(err) {
    console.error(err);
    mostrarToast('❌ Erro ao salvar: '+err.message, 'erro');
  }
}

function carregarHistoricoImportacoes() {
  db.ref('rotaads/importacoes').orderByChild('timestamp').limitToLast(20).once('value', snap => {
    const dados = snap.val() || {};
    const lista = Object.values(dados).reverse();
    const tbody = document.getElementById('historico-importacoes');
    if (!lista.length) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--cinza4);padding:20px;">Nenhuma importação ainda.</td></tr>`;
      return;
    }
    tbody.innerHTML = lista.map(imp => {
      const dt = new Date(imp.timestamp).toLocaleString('pt-BR');
      return `<tr>
        <td style="font-size:11px;">${dt}</td>
        <td>${imp.periodo||'—'}</td>
        <td>${(imp.corridas||0).toLocaleString('pt-BR')}</td>
        <td style="color:var(--vm);font-weight:700;">${(imp.motoristas||0)} motoristas</td>
        <td>${(imp.km||0).toLocaleString('pt-BR')} km</td>
        <td><span style="color:var(--verde);font-weight:700;">✅ Importado</span></td>
      </tr>`;
    }).join('');
  });
}
