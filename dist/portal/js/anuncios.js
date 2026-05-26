// ── Carregamento e exibição dos anúncios do anunciante ────────
function carregarAnuncios(anuncianteId) {
  db.ref('rotaads/campanhas').once('value', snapCamps => {
    const todasCampanhas = snapCamps.val() || {};
    const campIds = Object.entries(todasCampanhas)
      .filter(([,c]) => c && (c.anunciante === anuncianteId || c.anuncianteId === anuncianteId))
      .map(([id]) => id);

    const grid = document.getElementById('anuncios-grid');
    if (!campIds.length) {
      grid.innerHTML = `<div class="anuncio-empty"><div class="anuncio-empty-icon">🎬</div><div class="anuncio-empty-txt">Nenhum anúncio cadastrado ainda.<br><span style="font-size:11px;color:var(--cinza3)">Fale com a equipe MídiaCar para enviar seu criativo.</span></div></div>`;
      return;
    }
    db.ref('rotaads/anuncios').once('value', snapAds => {
      const todos = snapAds.val() || {};
      const lista = Object.values(todos).filter(a => a && campIds.includes(a.campanha));
      if (!lista.length) {
        grid.innerHTML = `<div class="anuncio-empty"><div class="anuncio-empty-icon">🎬</div><div class="anuncio-empty-txt">Nenhum anúncio cadastrado ainda.<br><span style="font-size:11px;color:var(--cinza3)">Fale com a equipe MídiaCar para enviar seu criativo.</span></div></div>`;
        return;
      }
      const datasAtivas = getDatasNoFiltro();
      let impTotal = 0;
      const kpiEl = document.getElementById('kpi-impressoes');
      const kpiVal = kpiEl ? parseInt(kpiEl.textContent.replace(/\./g,'').replace(/[^0-9]/g,'')) : 0;
      if (kpiVal > 0) {
        impTotal = kpiVal;
      } else {
        datasAtivas.forEach(d => { const m = metricasCompletas[d]; if(m) impTotal += (m.corridas||0) * aparicoesPorCorrida; });
      }

      window._anuncioLista = lista;
      grid.innerHTML = lista.map((a,idx) => `
        <div class="anuncio-card" onclick="abrirPreviaIdx(${idx})">
          <div class="anuncio-preview" style="position:relative;">
            ${a.url ? (a.tipo==='video'
              ? `<video src="${a.url}" style="width:100%;height:100%;object-fit:cover;pointer-events:none;" muted></video>`
              : `<img src="${a.url}" style="width:100%;height:100%;object-fit:cover;pointer-events:none;" />`
            ) : `<div style="width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#1a1a1a;pointer-events:none;gap:8px;">
                <div style="font-size:28px;">🎬</div>
                <div style="font-size:10px;color:rgba(255,255,255,0.3);text-align:center;padding:0 12px;">Criativo em produção</div>
              </div>`}
            <div class="anuncio-preview-play">▶</div>
            <div class="anuncio-canal-badge">${a.canal==='app'?'📱 App':'📺 Tablet'}</div>
          </div>
          <div class="anuncio-info">
            <div class="anuncio-nome">${a.titulo||a.nome||'Sem título'}</div>
            <div class="anuncio-meta">Canal: ${a.canal==='app'?'App do passageiro':'Tablet no carro'} · ${a.duracao||10}s<br>Status: <span style="color:var(--verde);font-weight:700;">${a.status||'Ativo'}</span></div>
            <div class="anuncio-stats">
              <div class="anuncio-stat"><div class="anuncio-stat-val">${impTotal.toLocaleString('pt-BR')}</div><div class="anuncio-stat-lbl">Impressões</div></div>
              <div class="anuncio-stat"><div class="anuncio-stat-val">${a.duracao||10}s</div><div class="anuncio-stat-lbl">Duração</div></div>
            </div>
          </div>
        </div>`).join('');
    });
  });
}
