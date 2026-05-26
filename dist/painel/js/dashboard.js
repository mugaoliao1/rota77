// ── Dashboard: campanhas ativas e inventário de aparições ─────
function renderDashboard() {
  const ativas = Object.entries(campanhas).filter(([,c])=>c&&(c.status==='Ativa'||c.status==='ativa'));
  const el = document.getElementById('dashboard-campanhas');
  if(!ativas.length) {
    el.innerHTML='<div class="empty"><div class="empty-icon">📋</div><div class="empty-text">Nenhuma campanha ativa.</div></div>';
    document.getElementById('dashboard-inventario').innerHTML='<div class="empty"><div class="empty-icon">📦</div><div class="empty-text">Nenhuma campanha ativa.</div></div>';
    return;
  }

  el.innerHTML=`<table class="tabela"><thead><tr><th>Campanha</th><th>Anunciante</th><th>Plano</th><th>Valor/mês</th><th>Status</th></tr></thead><tbody>
  ${ativas.map(([,c])=>`<tr>
    <td><strong>${c.nome||'—'}</strong></td>
    <td>${anunciantes[c.anunciante]?.nome||'—'}</td>
    <td><span class="badge badge-${c.plano||'start'}">${PLANOS[c.plano]?.nome||c.plano||'—'}</span></td>
    <td><strong>R$${Number(c.valorMensal||0).toLocaleString('pt-BR')}</strong></td>
    <td><span class="badge badge-${c.status}">${c.status}</span></td>
  </tr>`).join('')}</tbody></table>`;

  const inv = document.getElementById('dashboard-inventario');
  const planosKeys = ['start','movimento','dominante'];
  let htmlInv = '<div style="display:flex;flex-direction:column;gap:20px;padding:0 4px;">';

  planosKeys.forEach(pk => {
    const plano = PLANOS[pk] || configPlanos[pk] || {};
    const vagas = plano.vagas || (pk==='start'?8:pk==='movimento'?4:2);
    const aparicoes = plano.aparicoes || (pk==='start'?1:pk==='movimento'?2:4);
    const campsDePlano = ativas.filter(([,c])=>c.plano===pk);
    const ocupadas = campsDePlano.length;
    const livres = Math.max(0, vagas - ocupadas);
    const pct = Math.min(100, Math.round((ocupadas/vagas)*100));
    const cor = pct>=100?'#D7282B':pct>=75?'#F59E0B':'#22C55E';
    const alerta = pct>=100?' ⚠️ CHEIO':pct>=75?' ⚡ Quase cheio':'';
    const receitaPlano = campsDePlano.reduce((s,[,c])=>s+(Number(c.valorMensal)||0),0);

    htmlInv += `
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <span class="badge badge-${pk}">${plano.nome||pk}</span>
            <span style="font-size:12px;color:var(--cinza4);">${aparicoes} aparição${aparicoes>1?'ções':''}/ciclo · ${vagas} vagas</span>
            <span style="font-size:11px;font-weight:700;color:${cor};">${alerta}</span>
          </div>
          <div style="text-align:right;">
            <span style="font-size:13px;font-weight:700;color:var(--branco);">${ocupadas}/${vagas} vagas</span>
            <span style="font-size:11px;color:var(--cinza4);margin-left:8px;">R$${receitaPlano.toLocaleString('pt-BR')}/mês</span>
          </div>
        </div>
        <div style="background:var(--preto3);border-radius:8px;height:10px;overflow:hidden;">
          <div style="height:100%;width:${pct}%;background:${cor};border-radius:8px;transition:width 0.5s;"></div>
        </div>
        <div style="display:flex;gap:6px;margin-top:8px;flex-wrap:wrap;">
          ${Array.from({length:vagas},(_,i)=>{
            const camp = campsDePlano[i];
            return `<div style="flex:1;min-width:60px;max-width:120px;padding:6px 8px;background:${camp?'rgba(215,40,43,0.15)':'rgba(255,255,255,0.04)'};border:1px solid ${camp?'rgba(215,40,43,0.3)':'rgba(255,255,255,0.08)'};border-radius:6px;font-size:10px;color:${camp?'var(--branco)':'var(--cinza4)'};text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${camp?anunciantes[camp[1].anunciante]?.nome||camp[1].nome:'Livre'}">
              ${camp?`🔴 ${anunciantes[camp[1].anunciante]?.nome||camp[1].nome||'—'}`:'⬜ Livre'}
            </div>`;
          }).join('')}
        </div>
      </div>`;
  });

  htmlInv += '</div>';
  inv.innerHTML = htmlInv;
}
