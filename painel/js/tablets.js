// ── Tablets e autocomplete de motorista ──────────────────────
function renderTablets() {
  const items = Object.entries(tablets);
  const el = document.getElementById('lista-tablets');
  if(!items.length) {
    el.innerHTML='<div class="empty"><div class="empty-icon">📱</div><div class="empty-text">Nenhum tablet cadastrado.</div></div>';
    return;
  }
  el.innerHTML=`<table class="tabela"><thead><tr><th>Tablet</th><th>Motorista</th><th>Placa</th><th>Anúncios</th><th>Adesivo</th><th>Status</th><th></th></tr></thead><tbody>
  ${items.map(([id,t])=>`<tr>
    <td><strong>${t.nome||'—'}</strong></td>
    <td>${t.motorista||'—'}</td>
    <td><span style="font-family:'Montserrat',sans-serif;font-size:12px;">${t.placa||'—'}</span></td>
    <td style="font-size:12px;max-width:200px;">${t.anuncios?Object.keys(t.anuncios).map(aid=>anuncios[aid]?.nome||aid).join(', '):'—'}</td>
    <td>${t.adesivo?'<span class="badge badge-adesivo">🚗 Sim</span>':'<span style="color:var(--cinza4);font-size:12px;">Não</span>'}</td>
    <td><span class="badge badge-${t.status==='ativo'?'ativo':'pausado'}">${t.status||'—'}</span></td>
    <td><div class="acoes"><button class="btn-icon" onclick="editarTablet('${id}')">✏️</button><button class="btn-icon danger" onclick="deletar('tablets','${id}')">🗑️</button></div></td>
  </tr>`).join('')}</tbody></table>`;
}

function abrirModalTablet(id) {
  const t = id&&tablets[id];
  document.getElementById('tablet-id').value = id||'';
  document.getElementById('tablet-nome').value = t?(t.nome||''):'';
  document.getElementById('tablet-motorista').value = t?(t.motorista||''):'';
  document.getElementById('tablet-placa').value = t?(t.placa||''):'';
  document.getElementById('tablet-status').value = t?(t.status||'ativo'):'ativo';
  document.getElementById('tablet-adesivo').checked = t?(t.adesivo||false):false;
  const selecionados = t?.anuncios?Object.keys(t.anuncios):[];
  const div = document.getElementById('tablet-anuncios-lista');
  const anunciosTablet = Object.entries(anuncios).filter(([,a])=>a&&a.canal==='tablet');
  div.innerHTML = !anunciosTablet.length
    ? '<span style="font-size:12px;color:var(--cinza3);">Nenhum anúncio de tablet cadastrado.</span>'
    : anunciosTablet.map(([aid,a])=>`
        <label style="display:flex;align-items:center;gap:6px;font-size:12px;background:var(--preto3);border:1px solid var(--cinza1);padding:6px 10px;border-radius:6px;cursor:pointer;">
          <input type="checkbox" value="${aid}" ${selecionados.includes(aid)?'checked':''}/>
          ${a.nome}
        </label>`).join('');
  document.getElementById('modal-tablet-titulo').textContent = id?'Editar Tablet':'Novo Tablet';
  document.getElementById('modal-tablet').classList.add('show');
}
function editarTablet(id){ abrirModalTablet(id); }

async function salvarTablet() {
  const id = document.getElementById('tablet-id').value || db.ref().push().key;
  const cbs = document.querySelectorAll('#tablet-anuncios-lista input[type=checkbox]:checked');
  const as = {}; cbs.forEach(cb=>as[cb.value]=true);
  const d = {
    nome: document.getElementById('tablet-nome').value.trim(),
    motorista: document.getElementById('tablet-motorista').value.trim(),
    placa: document.getElementById('tablet-placa').value.trim().toUpperCase(),
    status: document.getElementById('tablet-status').value,
    adesivo: document.getElementById('tablet-adesivo').checked,
    anuncios: as,
  };
  if(!d.nome){mostrarToast('⚠️ Informe a identificação','erro');return;}
  await db.ref(`rotaads/tablets/${id}`).set(d);
  fecharModal('modal-tablet');
  mostrarToast('✅ Tablet salvo!','sucesso');
}

function autocompleteMotorista(valor) {
  const sugestoes = document.getElementById('motorista-sugestoes');
  if (!valor || valor.length < 2) { sugestoes.style.display='none'; return; }

  db.ref('rotaads/metricasMotoristas').once('value', snap => {
    const dados = snap.val() || {};
    const nomes = new Set();
    Object.values(dados).forEach(dia => {
      Object.values(dia).forEach(m => { if (m.nome) nomes.add(m.nome); });
    });

    function norm(s) { return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim(); }
    const q = norm(valor);
    const filtrados = [...nomes].filter(n => norm(n).includes(q)).sort().slice(0, 8);

    if (!filtrados.length) { sugestoes.style.display='none'; return; }

    sugestoes.style.display='block';
    sugestoes.innerHTML = filtrados.map(nome => `
      <div onclick="selecionarMotorista('${nome.replace(/'/g,"\\'")}') "
        style="padding:10px 14px;cursor:pointer;font-size:13px;color:#fff;border-bottom:1px solid #2a2a2a;"
        onmouseover="this.style.background='#2a2a2a'" onmouseout="this.style.background='transparent'">
        ${nome}
      </div>`).join('');
  });
}

function selecionarMotorista(nome) {
  document.getElementById('tablet-motorista').value = nome;
  document.getElementById('motorista-sugestoes').style.display = 'none';
}

document.addEventListener('click', e => {
  if (!e.target.closest('#motorista-sugestoes') && e.target.id !== 'tablet-motorista') {
    const s = document.getElementById('motorista-sugestoes');
    if (s) s.style.display = 'none';
  }
});
