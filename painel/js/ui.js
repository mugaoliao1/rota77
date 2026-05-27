// ── Navegação, KPIs, toast, modais ────────────────────────────
function atualizarKPIs() {
  const na = Object.keys(anunciantes).length;
  document.getElementById('kpi-anunciantes').textContent = na;
  document.getElementById('nav-badge-anunciantes').textContent = na;
  const ca = Object.values(campanhas).filter(c=>c&&c.status==='ativa');
  document.getElementById('kpi-campanhas').textContent = ca.length;
  document.getElementById('kpi-tablets').textContent = Object.values(tablets).filter(t=>t&&t.status==='ativo').length;
  const rec = ca.reduce((s,c)=>s+(Number(c.valorMensal)||0),0);
  document.getElementById('kpi-receita').textContent = 'R$'+rec.toLocaleString('pt-BR');
}

function navegar(pagina, el) {
  document.querySelectorAll('.nav-item').forEach(i=>i.classList.remove('ativo'));
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('ativo'));
  if(el) el.classList.add('ativo');
  document.getElementById('page-'+pagina).classList.add('ativo');
  if(pagina==='config') renderConfigPlanos();
  if(pagina==='importar') carregarHistoricoImportacoes();
  if(pagina==='templates') setTimeout(iniciarTemplates, 100);
  if(pagina==='escala') carregarConfigEscala();
  fecharSidebar();
}

function abrirSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('sidebar-overlay').classList.add('show');
}

function fecharSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}

function fecharModal(id) { document.getElementById(id).classList.remove('show'); }

function mostrarToast(msg, cls) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast show ${cls||''}`;
  setTimeout(()=>t.classList.remove('show'), 2800);
}

document.querySelectorAll('.modal-overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)o.classList.remove('show');}));

async function deletar(colecao, id) {
  if (!confirm('Confirmar exclusão?')) return
  try {
    await db.ref(`rotaads/${colecao}/${id}`).remove()
    mostrarToast('✅ Item excluído!', 'sucesso')
  } catch (e) {
    console.error('[painel/deletar]', e)
    mostrarToast('❌ Erro ao excluir: ' + e.message, 'erro')
  }
}
window.deletar = deletar
