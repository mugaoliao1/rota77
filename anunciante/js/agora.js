// ── Portal do Anunciante — "Transmitindo agora" (P6) ─────────
//
// Lê exibicoes reais do dia dos tablets do anunciante e mostra o
// anúncio DELE que está na tela agora (registro aberto e recente).
// Se o registro aberto mais recente é de outro anunciante (ou é um
// slot de clima/notícia, que não geram evento), mostra "entre anúncios".
// Sem nenhum registro do anunciante hoje → "nenhuma exibição hoje".
//
// Geração/ciclo de vida independentes do selo (P5); a resolução da cadeia
// campanhas→anúncios→tablets é compartilhada via veiculacao.js.
// NÃO usa fbOn em .info/serverTimeOffset — fbOn dedupa por path e roubaria
// o listener do selo; usa .once (offset é quase estático numa sessão).

let _agoraGeracao   = 0
let _agoraTablets   = []    // [{ nome, key, motorista }]
let _agoraMeusAnun  = null  // Set de anuncioIds do anunciante (ativos)
let _agoraNomes     = {}    // anuncioId -> { nome, url }
let _agoraRegistros = {}    // tabletKey -> objeto de registros do dia
let _agoraOffset    = 0
let _agoraHoje      = ''
let _agoraTick      = null

const _AGORA_FRESCOR_MS = 90000  // registro aberto conta como "agora" se começou há ≤ 90s

// AAAA-MM-DD local (mesma convenção do heartbeat — nunca UTC)
function _agoraData() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function _agoraFmtIdade(ms) {
  const s = Math.floor(ms / 1000)
  if (s < 60) return 'há ' + s + 's'
  const m = Math.floor(s / 60)
  if (m < 60) return 'há ' + m + 'min'
  return 'há ' + Math.floor(m / 60) + 'h'
}

function _agoraVazio(msg) {
  const el = document.getElementById('agora-vazio')
  if (el) el.textContent = msg
  uiZonaVazia('zona-agora')
}

function _agoraCard(nome, url, tabletLabel, quando) {
  const nomeEl = document.getElementById('agora-nome')
  const metaEl = document.getElementById('agora-meta')
  const thumb = document.querySelector('#zona-agora .agora-thumb')
  if (nomeEl) nomeEl.textContent = nome
  if (metaEl) metaEl.textContent = tabletLabel + ' · ' + quando
  if (thumb && url) { thumb.style.backgroundImage = 'url(' + url + ')'; thumb.style.backgroundSize = 'cover'; thumb.style.backgroundPosition = 'center' }
  uiZonaConteudo('zona-agora')  // remove esqueleto e o estado vazio
}

// Recalcula "agora" a partir dos registros carregados. Aborta se a
// geração ficou obsoleta (troca de usuário/logout).
function _agoraRecompor(g) {
  if (g !== _agoraGeracao) return
  // Portal offline: congela (não deixa o frescor virar "entre anúncios"
  // por falta da nossa conexão, não do tablet). P9.
  if (typeof _portalOnline !== 'undefined' && !_portalOnline) return
  if (!_agoraTablets.length || !_agoraMeusAnun) { _agoraVazio('Nenhuma exibição registrada hoje até agora.'); return }

  const agora = Date.now() + _agoraOffset
  let atual = null   // registro aberto e fresco, do anunciante, mais recente
  let temAlgum = false

  _agoraTablets.forEach(t => {
    const regs = _agoraRegistros[t.key] || {}
    Object.keys(regs).forEach(k => {
      const r = regs[k]
      if (!r || !_agoraMeusAnun.has(r.anuncioId)) return   // só anúncios DESTE anunciante
      temAlgum = true
      const aberto = r.tipo === 'anuncio_iniciado' && !r.motivoFim
      if (!aberto) return
      const inicio = typeof r.iniciadoEmServidor === 'number' ? r.iniciadoEmServidor : null
      const idade = inicio !== null ? (agora - inicio) : Infinity
      if (idade <= _AGORA_FRESCOR_MS) {
        const ordem = r.iniciadoEmDevice || 0
        if (!atual || ordem > atual._ordem) atual = { r: r, idade: idade, _ordem: ordem, tablet: t }
      }
    })
  })

  if (atual) {
    const info = _agoraNomes[atual.r.anuncioId] || {}
    const label = atual.tablet.motorista || atual.tablet.nome || 'Veículo'
    _agoraCard(info.nome || atual.r.anuncioId, info.url, label, _agoraFmtIdade(Math.max(0, atual.idade)))
  } else if (temAlgum) {
    _agoraVazio('Entre anúncios.')
  } else {
    _agoraVazio('Nenhuma exibição registrada hoje até agora.')
  }
}

async function iniciarAgora() {
  const g = ++_agoraGeracao
  if (_agoraTick) { clearInterval(_agoraTick); _agoraTick = null }  // idempotência (mesma correção do selo)
  _agoraTablets = []
  _agoraMeusAnun = null
  _agoraNomes = {}
  _agoraRegistros = {}
  _agoraOffset = 0
  _agoraHoje = _agoraData()
  const anuncianteId = (typeof ESCOPO !== 'undefined') && ESCOPO.anuncianteId
  if (!anuncianteId) return

  try {
    // Cadeia campanhas → anúncios ativos → tablets (compartilhada, veiculacao.js)
    const res = await resolverVeiculacao(anuncianteId, () => g === _agoraGeracao)
    if (!res) return                       // invalidado (troca de usuário/logout)
    _agoraTablets  = res.tablets
    _agoraMeusAnun = res.anuncioIds
    _agoraNomes    = res.anuncios

    // offset via .once (evita colisão de fbOn com o selo)
    const offSnap = await db.ref('.info/serverTimeOffset').once('value')
    if (g !== _agoraGeracao) return
    _agoraOffset = offSnap.val() || 0

    if (!_agoraTablets.length) { _agoraRecompor(g); return }

    // exibicoes do dia por tablet (paths distintos dos do selo — sem colisão)
    _agoraTablets.forEach(t => {
      fbOn(db.ref('rotaads/exibicoes/' + _agoraHoje + '/' + t.key), 'value', s => {
        if (g !== _agoraGeracao) return
        _agoraRegistros[t.key] = s.val() || {}
        _agoraRecompor(g)
      })
    })

    // tick de 1s: mantém "há Xs" e faz o registro aberto vencer o frescor
    // (tablet que morreu no meio de um anúncio → volta a "entre anúncios")
    _agoraTick = setInterval(() => _agoraRecompor(g), 1000)
    _agoraRecompor(g)  // estado inicial imediato
  } catch (err) {
    if (typeof mcErro === 'function') mcErro('[anunciante/agora] erro ao carregar exibições', err)
  }
}

function pararAgora() {
  _agoraGeracao++
  if (_agoraTick) { clearInterval(_agoraTick); _agoraTick = null }
  // Remove os listeners de exibições do dia corrente antes de descartar a
  // lista — necessário para a virada de dia (P8) reapontar sem vazar
  // listeners; no logout é redundante-seguro com fbOffTodos.
  _agoraTablets.forEach(t => {
    try { fbOff(db.ref('rotaads/exibicoes/' + _agoraHoje + '/' + t.key), 'value') } catch (_) {}
  })
  _agoraTablets = []
  _agoraMeusAnun = null
  _agoraRegistros = {}
}
