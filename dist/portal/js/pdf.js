// ── Geração de PDF do relatório ────────────────────────────────
async function gerarPDF() {
  if (!anuncianteAtual) return;
  const {jsPDF} = window.jspdf;
  const doc = new jsPDF({orientation:'portrait', unit:'mm', format:'a4'});
  const W = 210, H = 297;
  const datas = getDatasNoFiltro();

  const snapT = await db.ref('rotaads/tablets').once('value');
  const tabletsData = snapT.val() || {};
  const nomesTablet = Object.values(tabletsData)
    .filter(t => t && t.status !== 'inativo')
    .map(t => (t.motorista||'').trim()).filter(Boolean);

  { const snapM = await db.ref('rotaads/metricasMotoristas').once('value'); {
      const dadosPorData = snapM.val() || {};
      const agregado = {};
      datas.forEach(data => {
        const motNaData = dadosPorData[data] || {};
        Object.entries(motNaData).forEach(([key, m]) => {
          if (!agregado[key]) agregado[key] = { nome: m.nome, corridas: 0, km: 0 };
          agregado[key].corridas += m.corridas || 0;
          agregado[key].km += m.km || 0;
        });
      });

      let listaMotoristas = Object.values(agregado).sort((a,b) => b.corridas - a.corridas);
      if (nomesTablet.length > 0) {
        const comTablet = listaMotoristas.filter(m => nomesTablet.some(nt => nomesBatem(nt, m.nome)));
        if (comTablet.length > 0) listaMotoristas = comTablet;
      }
      listaMotoristas = listaMotoristas.slice(0, 10);
      listaMotoristas.forEach(m => { m.impressoes = Math.round(m.corridas * aparicoesPorCorrida); });

      let cor = 0, km = 0;
      let usouFiltro = false;
      if (nomesTablet.length > 0) {
        datas.forEach(data => {
          const motNaData = dadosPorData[data] || {};
          Object.values(motNaData).forEach(m => {
            if (nomesTablet.some(nt => nomesBatem(nt, m.nome))) { cor += m.corridas||0; km += m.km||0; usouFiltro = true; }
          });
        });
      }
      if (!usouFiltro) datas.forEach(d => { const m = metricasCompletas[d]; if(m){ cor += m.corridas||0; km += m.km||0; } });
      const imp = cor * aparicoesPorCorrida;

      const todasDoMes = Object.keys(metricasCompletas).filter(d => datas.length && d.startsWith(datas[0].substring(0,7))).sort();
      const diasNoMes = datas.length ? new Date(parseInt(datas[0].substring(0,4)), parseInt(datas[0].substring(5,7)), 0).getDate() : 30;
      const projecao = todasDoMes.length > 0 && imp > 0 ? Math.round((imp / todasDoMes.length) * diasNoMes) : 0;

      const grafDatas = datas.slice(-23);
      const grafVals = grafDatas.map(d => {
        const motNaData = dadosPorData[d] || {};
        let c = 0; let bat = false;
        if (nomesTablet.length > 0) Object.values(motNaData).forEach(m => { if(nomesTablet.some(nt=>nomesBatem(nt,m.nome))){c+=m.corridas||0;bat=true;} });
        if (!bat) Object.values(motNaData).forEach(m => { c += m.corridas||0; });
        return c * aparicoesPorCorrida;
      });

      // ═══════════════════════════════════════
      // PÁGINA 1
      // ═══════════════════════════════════════

      doc.setFillColor(10,10,10);
      doc.rect(0,0,W,H,'F');

      doc.setFillColor(215,40,43);
      doc.rect(0,0,4,H,'F');

      doc.setFillColor(20,20,20);
      doc.rect(4,0,W-4,52,'F');
      doc.setFillColor(215,40,43);
      doc.rect(4,52,W-4,1,'F');

      doc.setTextColor(255,255,255);
      doc.setFont('helvetica','bold');
      doc.setFontSize(28);
      doc.text('MÍDIA', 16, 22);
      doc.setTextColor(215,40,43);
      doc.text('CAR', 16 + doc.getTextWidth('MÍDIA') + 1, 22);
      doc.setTextColor(180,180,180);
      doc.setFont('helvetica','normal');
      doc.setFontSize(8);
      doc.text('SUA MARCA EM MOVIMENTO', 16, 29);

      doc.setTextColor(255,255,255);
      doc.setFont('helvetica','bold');
      doc.setFontSize(11);
      doc.text('RELATÓRIO DE CAMPANHA', 16, 42);
      doc.setFont('helvetica','normal');
      doc.setFontSize(8);
      doc.setTextColor(150,150,150);
      const periodoFmt = datas.length ? `${datas[0].split('-').reverse().join('/')} a ${datas[datas.length-1].split('-').reverse().join('/')}` : '—';
      doc.text(`Período: ${periodoFmt}  ·  Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`, 16, 49);

      doc.setTextColor(80,80,80);
      doc.setFontSize(7);
      doc.text('MídiaCar · Caçapava do Sul/RS', W-16, 49, {align:'right'});

      doc.setFillColor(28,28,28);
      doc.rect(4,53,W-4,28,'F');
      doc.setTextColor(255,255,255);
      doc.setFont('helvetica','bold');
      doc.setFontSize(18);
      doc.text(anuncianteAtual.nome||'Anunciante', 16, 67);
      doc.setFont('helvetica','normal');
      doc.setFontSize(8);
      doc.setTextColor(150,150,150);
      const planoNome = anuncianteAtual.plano ? `Plano ${anuncianteAtual.plano} · ${aparicoesPorCorrida} aparição${aparicoesPorCorrida>1?'ções':''}/ciclo` : '';
      doc.text(planoNome, 16, 75);

      doc.setFillColor(215,40,43,0.2);
      doc.setFillColor(40,15,15);
      doc.roundedRect(W-70,57,58,14,3,3,'F');
      doc.setDrawColor(215,40,43);
      doc.setLineWidth(0.3);
      doc.roundedRect(W-70,57,58,14,3,3,'S');
      doc.setTextColor(215,40,43);
      doc.setFont('helvetica','bold');
      doc.setFontSize(7);
      doc.text('● CAMPANHA ATIVA', W-41, 65, {align:'center'});

      const kpis = [
        {label:'IMPRESSÕES', val:imp.toLocaleString('pt-BR'), sub:'no período', destaque:true},
        {label:'CORRIDAS', val:cor.toLocaleString('pt-BR'), sub:'realizadas'},
        {label:'KM RODADOS', val:Math.round(km).toLocaleString('pt-BR')+' km', sub:'distância real'},
        {label:'DIAS ATIVOS', val:String(datas.length), sub:'dias com dados'},
        {label:'PROJEÇÃO DO MÊS', val:projecao.toLocaleString('pt-BR'), sub:'impressões estimadas', destaque:true},
      ];

      const scansSnap = await db.ref('rotaads/scans').once('value');
      const todosScans = scansSnap.val() || {};
      const campSnap2 = await db.ref('rotaads/campanhas').once('value');
      const todasCamp2 = campSnap2.val() || {};
      const campIds2 = Object.entries(todasCamp2)
        .filter(([,c]) => c && (c.anunciante === anuncianteAtual?.id || c.anuncianteId === anuncianteAtual?.id))
        .map(([id]) => id);
      const anSnap = await db.ref('rotaads/anuncios').once('value');
      const todosAn = anSnap.val() || {};
      const anIds2 = Object.keys(todosAn).filter(aid => campIds2.includes(todosAn[aid]?.campanha));
      let totalScans = 0;
      anIds2.forEach(aid => {
        const scansAn = todosScans[aid] || {};
        datas.forEach(data => { totalScans += scansAn[data] || 0; });
      });
      if (totalScans > 0) kpis.push({label:'QR SCANS', val:totalScans.toLocaleString('pt-BR'), sub:'leituras do QR Code'});

      let kpiY = 90;
      const kpiW = (W - 20 - 4*4) / 5;
      kpis.forEach((k, i) => {
        const x = 16 + i*(kpiW+4);
        doc.setFillColor(k.destaque?30:22, k.destaque?12:22, k.destaque?12:22);
        doc.roundedRect(x, kpiY, kpiW, 26, 2, 2, 'F');
        if (k.destaque) {
          doc.setDrawColor(215,40,43);
          doc.setLineWidth(0.4);
          doc.roundedRect(x, kpiY, kpiW, 26, 2, 2, 'S');
        }
        doc.setFillColor(k.destaque?215:80, k.destaque?40:80, k.destaque?43:80);
        doc.rect(x, kpiY, kpiW, 1.5, 'F');
        doc.setTextColor(k.destaque?215:120, k.destaque?40:120, k.destaque?43:120);
        doc.setFont('helvetica','bold');
        doc.setFontSize(5.5);
        doc.text(k.label, x + kpiW/2, kpiY+7, {align:'center'});
        doc.setTextColor(255,255,255);
        doc.setFont('helvetica','bold');
        doc.setFontSize(k.val.length > 7 ? 10 : 13);
        doc.text(k.val, x + kpiW/2, kpiY+17, {align:'center'});
        doc.setTextColor(100,100,100);
        doc.setFont('helvetica','normal');
        doc.setFontSize(5);
        doc.text(k.sub, x + kpiW/2, kpiY+23, {align:'center'});
      });

      const grafY = 128;
      doc.setTextColor(215,40,43);
      doc.setFont('helvetica','bold');
      doc.setFontSize(9);
      doc.text('Impressões por dia', 16, grafY);
      doc.setFillColor(215,40,43);
      doc.rect(16, grafY+1.5, 60, 0.4, 'F');

      const grafH = 35;
      const grafAreaY = grafY + 6;
      const grafAreaW = W - 32;
      const maxVal = Math.max(...grafVals, 1);
      const barW = Math.min((grafAreaW / grafDatas.length) - 1, 7);
      const barGap = grafAreaW / grafDatas.length;

      [0.25, 0.5, 0.75, 1].forEach(frac => {
        const lineY = grafAreaY + grafH - (frac * grafH);
        doc.setDrawColor(35,35,35);
        doc.setLineWidth(0.2);
        doc.line(16, lineY, W-16, lineY);
        doc.setTextColor(60,60,60);
        doc.setFontSize(5);
        doc.text(Math.round(maxVal*frac).toLocaleString('pt-BR'), 14, lineY+1, {align:'right'});
      });

      grafVals.forEach((v, i) => {
        const bH = Math.max(0.5, (v/maxVal) * grafH);
        const bX = 16 + i*barGap + (barGap-barW)/2;
        const bY = grafAreaY + grafH - bH;
        doc.setFillColor(215,40,43);
        doc.roundedRect(bX, bY, barW, bH, 0.8, 0.8, 'F');
        if (grafDatas.length <= 23) {
          doc.setTextColor(80,80,80);
          doc.setFontSize(4.5);
          doc.text(grafDatas[i].substring(8), bX+barW/2, grafAreaY+grafH+4, {align:'center'});
        }
      });

      const tabY = grafAreaY + grafH + 12;
      doc.setTextColor(215,40,43);
      doc.setFont('helvetica','bold');
      doc.setFontSize(9);
      doc.text('Top 10 motoristas do período', 16, tabY);
      doc.setFillColor(215,40,43);
      doc.rect(16, tabY+1.5, 80, 0.4, 'F');

      const thY = tabY + 7;
      doc.setFillColor(215,40,43);
      doc.rect(16, thY-4, W-32, 7, 'F');
      const cols = [16,26,100,140,168,192];
      const headers = ['#','MOTORISTA','CORRIDAS','IMPRESSÕES','KM'];
      doc.setTextColor(255,255,255);
      doc.setFont('helvetica','bold');
      doc.setFontSize(6);
      headers.forEach((h,i) => doc.text(h, cols[i]+1, thY));

      listaMotoristas.forEach((m, idx) => {
        const ry = thY + 6 + idx*9;
        doc.setFillColor(idx%2===0?22:18, idx%2===0?22:18, idx%2===0?22:18);
        doc.rect(16, ry-4, W-32, 9, 'F');
        doc.setTextColor(180,180,180);
        doc.setFont('helvetica','normal');
        doc.setFontSize(7);
        doc.text(String(idx+1), cols[0]+1, ry+1);
        const nomeCorte = m.nome.length>34 ? m.nome.substring(0,34)+'…' : m.nome;
        doc.text(nomeCorte, cols[1]+1, ry+1);
        doc.text(m.corridas.toLocaleString('pt-BR'), cols[2]+1, ry+1);
        doc.setTextColor(215,40,43);
        doc.setFont('helvetica','bold');
        doc.text(m.impressoes.toLocaleString('pt-BR'), cols[3]+1, ry+1);
        doc.setTextColor(180,180,180);
        doc.setFont('helvetica','normal');
        doc.text(Math.round(m.km).toLocaleString('pt-BR')+' km', cols[4]+1, ry+1);
      });

      if (anuncianteAtual?.temAdesivo) {
        const alcance = Math.round(km * 20);
        const adesivoY = thY + 6 + listaMotoristas.length * 9 + 10;
        doc.setFillColor(40,10,10);
        doc.roundedRect(16, adesivoY, W-32, 18, 2, 2, 'F');
        doc.setDrawColor(215,40,43);
        doc.setLineWidth(0.3);
        doc.roundedRect(16, adesivoY, W-32, 18, 2, 2, 'S');
        doc.setTextColor(215,40,43);
        doc.setFont('helvetica','bold');
        doc.setFontSize(7);
        doc.text('🚗 ALCANCE ESTIMADO DO ADESIVO', 22, adesivoY+6);
        doc.setTextColor(255,255,255);
        doc.setFontSize(14);
        doc.text(alcance.toLocaleString('pt-BR') + ' pessoas', 22, adesivoY+14);
        doc.setTextColor(120,120,120);
        doc.setFont('helvetica','normal');
        doc.setFontSize(6);
        doc.text(`${Math.round(km).toLocaleString('pt-BR')} km × 20 impactos/km · Estimativa baseada nos horários de operação`, W-18, adesivoY+14, {align:'right'});
      }

      doc.setFillColor(215,40,43);
      doc.rect(0,H-14,W,14,'F');
      doc.setTextColor(255,255,255);
      doc.setFont('helvetica','bold');
      doc.setFontSize(8);
      doc.text('MídiaCar', 16, H-6);
      doc.setFont('helvetica','normal');
      doc.setFontSize(7);
      doc.setTextColor(255,200,200);
      doc.text('Caçapava do Sul/RS  ·  Sua marca em movimento', 16, H-2);
      doc.setTextColor(255,255,255);
      doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')}`, W-16, H-4, {align:'right'});
      doc.setFontSize(6);
      doc.setTextColor(255,200,200);
      doc.text(`Impressões = corridas × ${aparicoesPorCorrida} aparição/ciclo (Plano ${anuncianteAtual.plano||'—'})`, W-16, H-1, {align:'right'});

      const nomeArq = `MídiaCar_${(anuncianteAtual.nome||'campanha').replace(/\s+/g,'_')}_${periodoFmt.replace(/\//g,'-').replace(/ /g,'')}.pdf`;
      doc.save(nomeArq);
  }}
}
