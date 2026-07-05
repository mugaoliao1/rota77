// ── Portal do Anunciante — estado de conexão do portal (P9) ──
//
// Detecta a conexão do PRÓPRIO portal (celular/computador do anunciante)
// via .info/connected e mostra um banner discreto quando offline, com a
// hora desde quando os dados estão congelados.
//
// Distinção que este módulo garante (Fase 1 §8):
//   1. Portal offline  → banner + selo/agora CONGELAM (não viram vermelho).
//   2. Tablet sem sinal → portal online, selo vermelho (P5, inalterado).
//   3. Sem exibição     → estados vazios de agora/feed (P6/P7, inalterados).
// Sem conexão própria, NÃO afirmamos nada sobre o tablet — por isso o
// selo/agora leem _portalOnline e param de envelhecer quando offline.
//
// path .info/connected é distinto do .info/serverTimeOffset do selo —
// sem colisão de fbOn. Listener removido no logout (pararConexao + fbOffTodos).

let _portalOnline   = true    // otimista até o 1º valor de .info/connected
let _conexaoDesde   = null    // instante em que ficou offline
let _conexaoGraceAte = 0      // fim da janela de graça pós-reconexão (P9.1)

// True durante os 2s após voltar de offline — o selo usa isso para não
// mostrar vermelho por heartbeat velho antes de o SDK reentregar o dado fresco.
function _conexaoEmGraca() {
  return Date.now() < _conexaoGraceAte
}

function _conexaoHora(ts) {
  const d = new Date(ts)
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

function _conexaoAplicar(online) {
  const eraOffline = (_portalOnline === false)
  _portalOnline = online
  const banner = document.getElementById('conexao-banner')
  if (online) {
    if (eraOffline) _conexaoGraceAte = Date.now() + 2000  // janela de graça pós-reconexão
    _conexaoDesde = null
    if (banner) banner.style.display = 'none'
    // Ao voltar, o SDK re-emite os listeners (heartbeat/exibições) e o tick
    // do selo já reavalia no próximo segundo — nada a forçar aqui.
  } else {
    if (!_conexaoDesde) _conexaoDesde = Date.now()
    if (banner) {
      banner.textContent = 'Você está offline — mostrando os últimos dados recebidos (desde ' + _conexaoHora(_conexaoDesde) + ')'
      banner.style.display = 'block'
    }
  }
}

function iniciarConexao() {
  // fbOn dedupa por path+evento — chamar de novo apenas re-registra, sem leak.
  fbOn(db.ref('.info/connected'), 'value', s => {
    _conexaoAplicar(s.val() === true)
  })
}

function pararConexao() {
  try { fbOff(db.ref('.info/connected'), 'value') } catch (_) {}
  _portalOnline = true
  _conexaoDesde = null
  _conexaoGraceAte = 0
  const banner = document.getElementById('conexao-banner')
  if (banner) banner.style.display = 'none'
}
