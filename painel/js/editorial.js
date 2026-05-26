// ── Conteúdo editorial (notícias) ────────────────────────────
function renderEditorial() {
  const items = Object.entries(editoriais||{});
  const el = document.getElementById('lista-editorial');
  if(!items.length) { el.innerHTML='<div class="empty"><div class="empty-icon">📰</div><div class="empty-text">Nenhum conteúdo editorial.</div></div>'; return; }
  const icones = {noticia:'📰', curiosidade:'💡', institucional:'🚗'};
  el.innerHTML=`<table class="tabela"><thead><tr><th>Tipo</th><th>Título</th><th>Resumo</th><th>Validade</th><th>Status</th><th></th></tr></thead><tbody>
  ${items.map(([id,e])=>`<tr>
    <td>${icones[e.tipo]||'📰'}</td>
    <td><strong>${e.titulo||'—'}</strong></td>
    <td style="font-size:12px;max-width:200px;color:var(--cinza4);">${e.resumo||'—'}</td>
    <td style="font-size:12px;">${e.validade||'—'}</td>
    <td><span class="badge badge-${e.status==='ativo'?'ativo':'pausado'}">${e.status==='ativo'?'Ativo':'Inativo'}</span></td>
    <td><div class="acoes"><button class="btn-icon" onclick="editarEditorial('${id}')">✏️</button><button class="btn-icon danger" onclick="deletar('editoriais','${id}')">🗑️</button></div></td>
  </tr>`).join('')}</tbody></table>`;
}

function abrirModalEditorial(id) {
  const e = id&&editoriais[id];
  document.getElementById('editorial-id').value = id||'';
  document.getElementById('editorial-tipo').value = e?(e.tipo||'noticia'):'noticia';
  document.getElementById('editorial-titulo-campo').value = e?(e.titulo||''):'';
  document.getElementById('editorial-resumo').value = e?(e.resumo||''):'';
  document.getElementById('editorial-status').value = e?(e.status||'ativo'):'ativo';
  document.getElementById('editorial-validade').value = e?(e.validade||''):'';
  document.getElementById('chars-count').textContent = e?(e.resumo||'').length:0;
  document.getElementById('modal-editorial-titulo').textContent = id?'Editar Notícia':'Nova Notícia';
  document.getElementById('modal-editorial').classList.add('show');
}
function editarEditorial(id){ abrirModalEditorial(id); }
function contarChars(){ document.getElementById('chars-count').textContent=document.getElementById('editorial-resumo').value.length; }

async function salvarEditorial() {
  const id = document.getElementById('editorial-id').value || db.ref().push().key;
  const titulo = document.getElementById('editorial-titulo-campo').value.trim();
  const resumo = document.getElementById('editorial-resumo').value.trim();
  if(!titulo){mostrarToast('⚠️ Informe o título','erro');return;}
  if(!resumo){mostrarToast('⚠️ Informe o resumo','erro');return;}
  const d = {
    tipo: document.getElementById('editorial-tipo').value,
    titulo, resumo,
    status: document.getElementById('editorial-status').value,
    validade: document.getElementById('editorial-validade').value,
    atualizadoEm: new Date().toISOString(),
  };
  await db.ref(`rotaads/editoriais/${id}`).set(d);
  fecharModal('modal-editorial');
  mostrarToast('✅ Notícia salva!','sucesso');
}
