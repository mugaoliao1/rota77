// ── Portal do Anunciante — resolução de escopo (P4) ──────────
//
// A partir do registro rotaads/usuarios/{uid} (já lido pelo gate de
// papel em auth.js), resolve o anunciante vinculado e carrega apenas
// os dados MÍNIMOS dele — o nome, para identidade no cabeçalho.
// A cadeia campanhas → anúncios → tablets é da P5 (o selo precisa dela);
// aqui paramos no anunciante, conforme escopo desta tarefa.
//
// ESCOPO é o estado global lido pelos componentes das próximas tarefas.

let ESCOPO = { anuncianteId: null, anunciante: null }

// Retorna true se o vínculo resolveu e o anunciante existe; false se o
// usuário não tem anuncianteId ou aponta para um anunciante inexistente.
// Falha de leitura (regra/rede) retorna false — nunca resolve na dúvida.
async function resolverEscopo(usuarioRec) {
  const anuncianteId = usuarioRec && usuarioRec.anuncianteId
  if (!anuncianteId) {
    if (typeof mcErro === 'function') mcErro('[anunciante/escopo] usuário anunciante sem anuncianteId')
    return false
  }
  try {
    const snap = await firebase.database().ref('rotaads/anunciantes/' + anuncianteId).once('value')
    const a = snap.val()
    if (!a) {
      if (typeof mcErro === 'function') mcErro('[anunciante/escopo] anuncianteId sem registro: ' + anuncianteId)
      return false
    }
    ESCOPO = {
      anuncianteId: anuncianteId,
      anunciante: { nome: a.nome || '' }   // mínimo necessário — só identidade
    }
    _escopoRenderIdentidade()
    return true
  } catch (err) {
    if (typeof mcErro === 'function') mcErro('[anunciante/escopo] erro ao carregar anunciante', err)
    return false
  }
}

function _escopoRenderIdentidade() {
  const el = document.getElementById('topo-anunciante')
  if (el && ESCOPO.anunciante) el.textContent = ESCOPO.anunciante.nome
}

function limparEscopo() {
  ESCOPO = { anuncianteId: null, anunciante: null }
  const el = document.getElementById('topo-anunciante')
  if (el) el.textContent = ''
}
