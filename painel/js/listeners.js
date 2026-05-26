// ── Realtime listeners Firebase ───────────────────────────────
function iniciarEscuta() {
  fbOn(db.ref('rotaads/anunciantes'), 'value', s=>{anunciantes=s.val()||{};renderDashboard();renderAnunciantes();atualizarKPIs();});
  fbOn(db.ref('rotaads/campanhas'),   'value', s=>{campanhas=s.val()||{};renderDashboard();renderAnunciantes();atualizarKPIs();if(anuncianteAtualId)abrirDetalheAnunciante(anuncianteAtualId);});
  fbOn(db.ref('rotaads/anuncios'),    'value', s=>{anuncios=s.val()||{};renderTablets();});
  fbOn(db.ref('rotaads/tablets'),     'value', s=>{tablets=s.val()||{};renderTablets();atualizarKPIs();});
  fbOn(db.ref('rotaads/editoriais'),  'value', s=>{editoriais=s.val()||{};renderEditorial();});
  iniciarEscutaConfig();
}
