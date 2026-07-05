// ── Portal do Anunciante — selo NO AR (P5) ───────────────────
//
// Resolve a cadeia do anunciante logado (ESCOPO) → campanhas →
// anúncios ativos → tablets ativos que os exibem → heartbeats desses
// tablets, e traduz a idade do heartbeat mais recente no estado do selo.
//
// Semântica (resposta à pergunta "minha campanha está no ar?"):
// prevalece o MELHOR estado entre os tablets do anunciante — se ao
// menos um veículo está transmitindo, a campanha está no ar. O
// detalhe por tablet fica para o painel de diagnóstico (C4/P8).
//
// Proteção contra troca de usuário no meio do carregamento: cada
// carga captura uma "geração"; após todo await e em todo callback,
// aborta se a geração mudou (novo login ou logout invalidam a anterior).
// A remoção dos listeners no logout é feita por fbOffTodos() em auth.js.

let _seloGeracao   = 0
let _seloTablets   = []   // [{ nome, key }]
let _seloHeartbeats = {}   // key -> último valor do heartbeat
let _seloOffset    = 0    // .info/serverTimeOffset (relógio confiável)
let _seloTick      = null

// (a sanitização de chave e a resolução da cadeia migraram para veiculacao.js)

function _seloFmtIdade(ms) {
  const s = Math.floor(ms / 1000)
  if (s < 60) return 'há ' + s + 's'
  const m = Math.floor(s / 60)
  if (m < 60) return 'há ' + m + 'min'
  return 'há ' + Math.floor(m / 60) + 'h'
}

// Traduz os heartbeats atuais no estado do selo. Aborta se a geração
// ficou obsoleta (troca de usuário/logout durante o intervalo).
function _seloRecompor(g) {
  if (g !== _seloGeracao) return
  // Portal offline: congela o selo (não envelhece rumo ao vermelho — sem
  // conexão própria não afirmamos nada sobre o tablet). P9.
  if (typeof _portalOnline !== 'undefined' && !_portalOnline) return
  if (!_seloTablets.length) {
    uiSelo('cinza', 'Sem campanha ativa', 'Nenhuma campanha em veiculação no momento')
    return
  }
  const agora = Date.now() + _seloOffset
  let melhorIdade = Infinity
  let algumComHb = false
  _seloTablets.forEach(t => {
    const hb = _seloHeartbeats[t.key]
    if (hb && typeof hb.ultimoHeartbeatServidor === 'number') {
      algumComHb = true
      const idade = agora - hb.ultimoHeartbeatServidor
      if (idade < melhorIdade) melhorIdade = idade
    }
  })
  if (!algumComHb) {
    uiSelo('cinza', 'Aguardando sinal', 'Aguardando primeiro sinal do veículo')
    return
  }
  const quando = _seloFmtIdade(Math.max(0, melhorIdade))
  if (melhorIdade <= 40000) {
    uiSelo('verde', 'NO AR', 'Sua campanha está rodando agora · verificado ' + quando)
  } else if (melhorIdade <= 180000) {
    uiSelo('ambar', 'Instável', 'Sinal intermitente · verificado ' + quando)
  } else if (typeof _conexaoEmGraca === 'function' && _conexaoEmGraca()) {
    // Janela de graça pós-reconexão: heartbeat ainda pode estar velho em
    // cache; não culpar o tablet até o dado fresco chegar (P9.1).
    uiSelo('cinza', 'Aguardando sinal', 'Reconectando…')
  } else {
    uiSelo('vermelho', 'Sem sinal', 'Nenhum veículo transmitindo · último sinal ' + quando)
  }
}

// Carrega a cadeia e anexa os listeners de heartbeat. Chamada por
// auth.js após o escopo resolver e o app ser exibido.
async function iniciarSelo() {
  const g = ++_seloGeracao
  if (_seloTick) { clearInterval(_seloTick); _seloTick = null }  // idempotência: nunca deixa tick órfão
  _seloTablets = []
  _seloHeartbeats = {}
  _seloOffset = 0
  const anuncianteId = (typeof ESCOPO !== 'undefined') && ESCOPO.anuncianteId
  if (!anuncianteId) return

  try {
    // Cadeia campanhas → anúncios ativos → tablets (compartilhada, veiculacao.js)
    const res = await resolverVeiculacao(anuncianteId, () => g === _seloGeracao)
    if (!res) return                       // invalidado (troca de usuário/logout)
    _seloTablets = res.tablets             // o selo usa apenas t.key

    if (!_seloTablets.length) { _seloRecompor(g); return }  // sem campanha ativa — sem listeners

    // Relógio confiável + heartbeat de cada tablet (fbOn: dedup + cleanup no logout)
    fbOn(db.ref('.info/serverTimeOffset'), 'value', s => {
      if (g !== _seloGeracao) return
      _seloOffset = s.val() || 0
      _seloRecompor(g)
    })
    _seloTablets.forEach(t => {
      fbOn(db.ref('rotaads/heartbeats/' + t.key), 'value', s => {
        if (g !== _seloGeracao) return
        _seloHeartbeats[t.key] = s.val()
        _seloRecompor(g)
      })
    })

    // Tick de 1s: um tablet que parou de enviar migra verde→âmbar→vermelho só pelo tempo
    _seloTick = setInterval(() => _seloRecompor(g), 1000)
    _seloRecompor(g)  // estado inicial imediato (aguardando, até o 1º heartbeat)
  } catch (err) {
    if (typeof mcErro === 'function') mcErro('[anunciante/selo] erro ao carregar cadeia', err)
  }
}

// Invalida qualquer carga em voo e para o tick. Os listeners fb são
// removidos por fbOffTodos() no branch de logout de auth.js.
function pararSelo() {
  _seloGeracao++
  if (_seloTick) { clearInterval(_seloTick); _seloTick = null }
  _seloTablets = []
  _seloHeartbeats = {}
}
