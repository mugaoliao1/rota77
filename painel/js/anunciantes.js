// ── Anunciantes, campanhas e seus modais ─────────────────────
function renderAnunciantes() {
  const items = Object.entries(anunciantes);
  const grid = document.getElementById('grid-anunciantes');
  if(!items.length) {
    grid.innerHTML='<div class="empty" style="grid-column:1/-1"><div class="empty-icon">🏢</div><div class="empty-text">Nenhum anunciante cadastrado.</div><button class="btn btn-ghost" onclick="abrirModalAnunciante()">+ Adicionar primeiro anunciante</button></div>';
    return;
  }
  grid.innerHTML = items.map(([id,a])=>{
    const camps = Object.values(campanhas).filter(c=>c && (c.anunciante===id || c.anuncianteId===id));
    const ativas = camps.filter(c=>c.status==='Ativa'||c.status==='ativa').length;
    const receita = camps.filter(c=>c.status==='Ativa'||c.status==='ativa').reduce((s,c)=>s+(Number(c.valorMensal)||0),0);
    return `<div class="anunciante-card" onclick="abrirDetalheAnunciante('${id}')">
      <div class="anunciante-card-header">
        <div class="anunciante-avatar">${(a.nome||'?').charAt(0).toUpperCase()}</div>
        <div>
          <div class="anunciante-nome">${a.nome||'—'}</div>
          <div class="anunciante-contato">${a.categoria||''} ${a.contato?'· '+a.contato:''}</div>
        </div>
      </div>
      <div class="anunciante-card-body">
        <div class="anunciante-stats">
          <div><div class="anunciante-stat-val">${camps.length}</div><div class="anunciante-stat-label">Campanhas</div></div>
          <div><div class="anunciante-stat-val">${ativas}</div><div class="anunciante-stat-label">Ativas</div></div>
          <div><div class="anunciante-stat-val" style="color:var(--vm-light);">R$${receita.toLocaleString('pt-BR')}</div><div class="anunciante-stat-label">Mensal</div></div>
        </div>
      </div>
      <div class="anunciante-card-footer">
        <span class="badge badge-${ativas>0?'ativo':'pausado'}">${ativas>0?'Com campanha ativa':'Sem campanha ativa'}</span>
        <div class="acoes" onclick="event.stopPropagation()">
          <button class="btn-icon" onclick="editarAnunciante('${id}')">✏️</button>
          <button class="btn-icon danger" onclick="deletar('anunciantes','${id}')">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('');
}

function abrirDetalheAnunciante(id) {
  anuncianteAtualId = id;
  const a = anunciantes[id];
  if(!a) return;
  document.getElementById('view-lista-anunciantes').style.display='none';
  document.getElementById('view-detalhe-anunciante').style.display='block';
  document.getElementById('detalhe-anunciante-nome').textContent = a.nome||'—';
  document.getElementById('detalhe-anunciante-meta').textContent = [a.categoria, a.whatsapp].filter(Boolean).join(' · ');

  const camps = Object.entries(campanhas).filter(([,c])=>c && (c.anunciante===id||c.anuncianteId===id));
  const el = document.getElementById('lista-campanhas-detalhe');
  if(!camps.length) {
    const orfas = Object.entries(campanhas).filter(([,c])=>c && (!c.anunciante||c.anunciante===''));
    if(orfas.length) {
      el.innerHTML=`<div class="empty">
        <div class="empty-icon">🔗</div>
        <div class="empty-text">Nenhuma campanha vinculada.<br>
        <span style="font-size:11px;color:var(--cinza4);">Existem ${orfas.length} campanha(s) sem anunciante definido.</span></div>
        <button class="btn btn-primary" style="margin-top:12px;" onclick="reconectarCampanhas('${id}')">🔗 Reconectar campanhas órfãs</button>
      </div>`;
    } else {
      el.innerHTML='<div class="empty"><div class="empty-icon">📣</div><div class="empty-text">Nenhuma campanha ainda.</div></div>';
    }
    return;
  }
  el.innerHTML = camps.map(([cid,c])=>{
    const anunciosDaCamp = Object.entries(anuncios).filter(([,an])=>an&&an.campanha===cid);
    const ativos = anunciosDaCamp.filter(([,an])=>an.status==='ativo').length;
    return `<div class="campanha-item" id="camp-${cid}">
      <div class="campanha-item-header" onclick="toggleCampanha('${cid}')">
        <span class="badge badge-${c.plano||'start'}">${PLANOS[c.plano]?.nome||'—'}</span>
        <div>
          <div class="campanha-nome">${c.nome||'—'}</div>
          <div class="campanha-meta">R$${Number(c.valorMensal||0).toLocaleString('pt-BR')}/mês · ${c.inicio||'—'} a ${c.fim||'—'}</div>
        </div>
        <span class="badge badge-${c.status}" style="margin-left:auto;">${c.status}</span>
        <div class="acoes" style="margin-left:8px;" onclick="event.stopPropagation()">
          <button class="btn-icon" onclick="editarCampanha('${cid}')">✏️</button>
          <button class="btn-icon" style="background:var(--vm-bg);color:var(--vm-light);border-color:rgba(212,43,43,0.2);" onclick="abrirModalAnuncio('${cid}')">+ Anúncio</button>
          <button class="btn-icon danger" onclick="deletar('campanhas','${cid}')">🗑️</button>
        </div>
        <span class="campanha-expand">▼</span>
      </div>
      <div class="campanha-anuncios">
        ${anunciosDaCamp.length ? anunciosDaCamp.map(([aid,an])=>`
          <div class="campanha-anuncio-item">
            <div class="campanha-anuncio-dot ${an.status==='ativo'?'ativo':''}"></div>
            <span class="badge badge-${an.canal||'tablet'}" style="font-size:10px;">${an.canal||'tablet'}</span>
            <span style="font-size:13px;flex:1;">${an.nome||'—'}</span>
            <span style="font-size:11px;color:var(--cinza4);">${an.duracao||10}s</span>
            <span class="badge badge-${an.status==='ativo'?'ativo':'pausado'}" style="font-size:10px;">${an.status||'—'}</span>
            <div class="acoes">
              <button class="btn-icon" onclick="editarAnuncio('${aid}','${cid}')">✏️</button>
              <button class="btn-icon danger" onclick="deletar('anuncios','${aid}')">🗑️</button>
            </div>
          </div>`).join('') : '<div style="padding:16px 20px;font-size:13px;color:var(--cinza4);">Nenhum anúncio nesta campanha. <span style="color:var(--vm-light);cursor:pointer;" onclick="abrirModalAnuncio(\''+cid+'\')">+ Adicionar</span></div>'}
      </div>
    </div>`;
  }).join('');
}

function toggleCampanha(id) {
  document.getElementById('camp-'+id).classList.toggle('aberta');
}

function voltarAnunciantes() {
  anuncianteAtualId = null;
  document.getElementById('view-lista-anunciantes').style.display='block';
  document.getElementById('view-detalhe-anunciante').style.display='none';
}

function editarAnuncianteAtual() {
  if(anuncianteAtualId) editarAnunciante(anuncianteAtualId);
}

function abrirModalAnunciante(id) {
  const a = id&&anunciantes[id];
  document.getElementById('anunciante-id').value = id||'';
  document.getElementById('anunciante-nome').value = a?(a.nome||''):'';
  document.getElementById('anunciante-contato').value = a?(a.contato||''):'';
  document.getElementById('anunciante-whatsapp').value = a?(a.whatsapp||''):'';
  document.getElementById('anunciante-categoria').value = a?(a.categoria||''):'';
  document.getElementById('anunciante-usuario').value = a?(a.usuario||''):'';
  document.getElementById('anunciante-senha').value = a?(a.senha||''):'';
  document.getElementById('anunciante-obs').value = a?(a.obs||''):'';
  document.getElementById('modal-anunciante-titulo').textContent = id?'Editar Anunciante':'Novo Anunciante';
  document.getElementById('modal-anunciante').classList.add('show');
}
function editarAnunciante(id){ abrirModalAnunciante(id); }

async function salvarAnunciante() {
  const id = document.getElementById('anunciante-id').value || db.ref().push().key;
  const d = {};
  ['nome','contato','whatsapp','categoria','usuario','senha','obs'].forEach(f=>d[f]=document.getElementById('anunciante-'+f).value.trim());
  if(!d.nome){mostrarToast('⚠️ Informe o nome','erro');return;}
  await db.ref(`rotaads/anunciantes/${id}`).set(d);
  fecharModal('modal-anunciante');
  mostrarToast('✅ Anunciante salvo!','sucesso');
}

function abrirModalCampanha(id) {
  const c = id&&campanhas[id];
  planoAtual = null;
  contadores = {adesivos:0};
  document.querySelectorAll('.plano-btn').forEach(b=>b.classList.remove('sel'));
  document.getElementById('campanha-id').value = id||'';
  document.getElementById('campanha-nome').value = c?(c.nome||''):'';
  document.getElementById('campanha-obs').value = c?(c.obs||''):'';
  document.getElementById('campanha-inicio').value = c?(c.inicio||''):'';
  document.getElementById('campanha-fim').value = c?(c.fim||''):'';
  document.getElementById('campanha-status').value = c?(c.status||'ativa'):'ativa';
  document.getElementById('campanha-objetivo').value = c?(c.objetivo||'marca'):'marca';
  document.getElementById('adicionais-box').classList.remove('show');
  document.getElementById('preco-total').style.display='none';
  document.getElementById('cont-adesivos').textContent = '0';
  if(document.getElementById('check-exclusividade')) document.getElementById('check-exclusividade').checked=false;

  ['start','movimento','dominante'].forEach(p => {
    const plano = PLANOS[p] || configPlanos[p] || {};
    const precoEl = document.getElementById(`plano-preco-${p}`);
    const descEl = document.getElementById(`plano-desc-${p}`);
    if(precoEl) precoEl.textContent = `R$${(plano.preco||0).toLocaleString('pt-BR')}`;
    if(descEl) descEl.textContent = `${plano.aparicoes||1} aparição${(plano.aparicoes||1)>1?'ções':''}/ciclo`;
  });

  if(c&&c.plano) {
    const btn = document.querySelector(`.plano-btn[onclick*="'${c.plano}'"]`);
    if(btn) selecionarPlano(c.plano, btn);
    contadores.adesivos = c.adesivos||0;
    document.getElementById('cont-adesivos').textContent = contadores.adesivos;
    recalcular();
  }
  document.getElementById('modal-campanha-titulo').textContent = id?'Editar Campanha':'Nova Campanha';
  document.getElementById('modal-campanha').classList.add('show');
}
function editarCampanha(id){ abrirModalCampanha(id); }

function selecionarPlano(tipo, el) {
  planoAtual = tipo;
  document.querySelectorAll('.plano-btn').forEach(b=>b.classList.remove('sel'));
  el.classList.add('sel');
  document.getElementById('adicionais-box').classList.add('show');
  const rowExcl = document.getElementById('row-exclusividade');
  rowExcl.style.display = (tipo==='start') ? 'none' : 'flex';
  if(tipo==='start' && document.getElementById('check-exclusividade'))
    document.getElementById('check-exclusividade').checked=false;
  const precoExcl = PLANOS[tipo]?.exclusividade||0;
  document.getElementById('preco-exclusividade').textContent = precoExcl.toLocaleString('pt-BR');
  recalcular();
}

function mudarContador(campo, delta) {
  contadores[campo] = Math.max(0, (contadores[campo]||0) + delta);
  document.getElementById('cont-'+campo).textContent = contadores[campo];
  recalcular();
}

function recalcular() {
  if(!planoAtual) return;
  const plano = PLANOS[planoAtual];
  let total = plano.preco;
  const partes = [`Plano ${plano.nome} R$${plano.preco}`];
  if(contadores.adesivos>0) {
    const ad = contadores.adesivos * PRECO_ADESIVO;
    total += ad;
    partes.push(`${contadores.adesivos} carro(s) adesivado(s) +R$${ad}`);
  }
  const excl = document.getElementById('check-exclusividade');
  if(excl&&excl.checked&&plano.exclusividade>0) {
    total += plano.exclusividade;
    partes.push(`Exclusividade +R$${plano.exclusividade}`);
  }
  document.getElementById('preco-total').style.display='flex';
  document.getElementById('preco-val').textContent = 'R$'+total.toLocaleString('pt-BR');
  document.getElementById('preco-detalhe').textContent = partes.join(' · ');
}

async function salvarCampanha() {
  const id = document.getElementById('campanha-id').value || db.ref().push().key;
  if(!planoAtual){mostrarToast('⚠️ Selecione um plano','erro');return;}
  if(!anuncianteAtualId){mostrarToast('⚠️ Erro: nenhum anunciante selecionado','erro');return;}
  const nome = document.getElementById('campanha-nome').value.trim();
  if(!nome){mostrarToast('⚠️ Informe o nome','erro');return;}
  const plano = PLANOS[planoAtual];
  let valorMensal = plano.preco;
  if(contadores.adesivos>0) valorMensal += contadores.adesivos*PRECO_ADESIVO;
  const excl = document.getElementById('check-exclusividade');
  if(excl&&excl.checked&&plano.exclusividade>0) valorMensal+=plano.exclusividade;
  const dados = {
    nome,
    anunciante: anuncianteAtualId,
    plano: planoAtual,
    valorMensal,
    adesivos: contadores.adesivos,
    exclusividade: excl&&excl.checked?true:false,
    inicio: document.getElementById('campanha-inicio').value,
    fim: document.getElementById('campanha-fim').value,
    status: document.getElementById('campanha-status').value,
    objetivo: document.getElementById('campanha-objetivo').value,
    obs: document.getElementById('campanha-obs').value.trim(),
  };
  await db.ref(`rotaads/campanhas/${id}`).set(dados);
  fecharModal('modal-campanha');
  mostrarToast('✅ Campanha salva!','sucesso');
}

async function reconectarCampanhas(anuncianteId) {
  const orfas = Object.entries(campanhas).filter(([,c])=>c && (!c.anunciante||c.anunciante===''));
  if(!orfas.length) { mostrarToast('Nenhuma campanha órfã encontrada.',''); return; }
  const updates = {};
  orfas.forEach(([campId]) => { updates[`rotaads/campanhas/${campId}/anunciante`] = anuncianteId; });
  try {
    await db.ref().update(updates);
    mostrarToast(`✅ ${orfas.length} campanha(s) reconectada(s)!`, 'sucesso');
    setTimeout(()=>abrirDetalheAnunciante(anuncianteId), 800);
  } catch(e) {
    mostrarToast('❌ Erro ao reconectar: '+e.message, 'erro');
  }
}
