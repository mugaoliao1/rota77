// ── Reset de dados ────────────────────────────────────────────
function confirmarReset() {
  const conf1 = confirm('⚠️ ATENÇÃO!\n\nIsso vai apagar permanentemente:\n• Todos os anunciantes\n• Todas as campanhas\n• Todos os anúncios\n• Todos os tablets\n• Todas as métricas e importações\n\nAs configurações de planos serão mantidas.\n\nDeseja continuar?');
  if (!conf1) return;
  const conf2 = confirm('Tem certeza absoluta? Esta ação NÃO pode ser desfeita.');
  if (!conf2) return;
  resetDados();
}

async function resetDados() {
  try {
    mostrarToast('🔄 Apagando dados...', '');
    const paths = [
      'rotaads/anunciantes',
      'rotaads/campanhas',
      'rotaads/anuncios',
      'rotaads/tablets',
      'rotaads/metricas',
      'rotaads/metricasMotoristas',
      'rotaads/motoristas',
      'rotaads/importacoes',
      'rotaads/editoriais',
    ];
    const promises = paths.map(p => db.ref(p).remove());
    await Promise.all(promises);
    mostrarToast('✅ Dados apagados com sucesso!', 'sucesso');
  } catch(err) {
    console.error(err);
    mostrarToast('❌ Erro ao apagar: ' + err.message, 'erro');
  }
}
