// ── Portal do Anunciante — feed de exibições recentes (P7) ───
//
// Lista as exibições de hoje dos anúncios do anunciante, mais recente
// no topo, com estado (ao vivo / completo / interrompido / erro) e um
// contador do dia. Reusa resolverVeiculacao() (veiculacao.js) para a
// cadeia — não duplica a resolução de selo/agora.
//
// IMPORTANTE: o "Transmitindo agora" (agora.js) já escuta
// exibicoes/{hoje}/{tablet} com evento 'value'. fbOn dedupa por
// path+evento, então o feed usa 'child_added'/'child_changed' (eventos
// distintos) para NÃO roubar o listener do agora. Sem orderBy/limit no
// servidor (evita exigir índice); ordenação e corte são no cliente.

let _feedGeracao  = 0
let _feedTablets  = []
let _feedMeusAnun = null
let _feedNomes    = {}
let _feedRegs     = {}    // tabletKey -> { childKey -> registro }
let _feedHoje     = ''
let _feedAgendado = false

const _FEED_MAX = 50      // linhas exibidas (o contador conta o dia inteiro)

function _feedData() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function _feedHora(ts) {
  const d = new Date(ts)
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0') + ':' + String(d.getSeconds()).padStart(2, '0')
}

// Estado visual a partir do registro. Classes já existem no CSS (P1):
// aberta(azul) · completo(verde) · interrompido(amarelo) · erro(vermelho)
function _feedEstado(r) {
  if (r.tipo === 'anuncio_iniciado' && !r.motivoFim) return { classe: 'aberta', label: 'ao vivo' }
  if (r.tipo === 'erro_playback' || r.motivoFim === 'erro_playback') return { classe: 'erro', label: 'erro' }
  if (r.motivoFim === 'interrompido') return { classe: 'interrompido', label: 'interrompido' }
  if (r.motivoFim === 'completo') return { classe: 'completo', label: 'completo' }
  return { classe: 'completo', label: 'concluído' }  // anuncio_concluido sem motivoFim conhecido
}

// Coalescência: uma rajada de child_added no attach vira um único render.
function _feedAgendarRecompor(g) {
  if (g !== _feedGeracao || _feedAgendado) return
  _feedAgendado = true
  setTimeout(() => { _feedAgendado = false; _feedRecompor(g) }, 60)
}

function _feedRecompor(g) {
  if (g !== _feedGeracao) return

  const linhas = []
  let completas = 0
  _feedTablets.forEach(t => {
    const regs = _feedRegs[t.key] || {}
    Object.keys(regs).forEach(k => {
      const r = regs[k]
      if (!r || !_feedMeusAnun.has(r.anuncioId)) return   // só anúncios DESTE anunciante
      if (r.motivoFim === 'completo') completas++
      linhas.push({ r: r, tablet: t, ordem: r.iniciadoEmDevice || 0 })
    })
  })

  const contadorEl = document.getElementById('feed-contador')
  const listaEl = document.getElementById('feed-lista')

  if (!linhas.length) {
    uiZonaVazia('zona-feed')
    return
  }

  linhas.sort((a, b) => b.ordem - a.ordem)
  if (contadorEl) contadorEl.textContent = 'hoje: ' + linhas.length + ' exibiç' + (linhas.length === 1 ? 'ão' : 'ões') + ' · ' + completas + ' completa' + (completas === 1 ? '' : 's')

  // Render seguro via DOM (nomes de anúncio são semi-confiáveis) — sem innerHTML
  if (listaEl) {
    listaEl.textContent = ''
    linhas.slice(0, _FEED_MAX).forEach(({ r, tablet }) => {
      const info = _feedNomes[r.anuncioId] || {}
      const est = _feedEstado(r)
      const item = document.createElement('div'); item.className = 'feed-item'
      const hora = document.createElement('span'); hora.className = 'feed-hora'; hora.textContent = _feedHora(r.iniciadoEmDevice || Date.now())
      const nome = document.createElement('span'); nome.className = 'feed-nome'; nome.textContent = info.nome || r.anuncioId || '—'
      const st = document.createElement('span'); st.className = 'feed-status ' + est.classe; st.textContent = est.label
      item.appendChild(hora); item.appendChild(nome); item.appendChild(st)
      listaEl.appendChild(item)
    })
  }
  uiZonaConteudo('zona-feed')  // remove esqueleto/estado vazio
}

async function iniciarFeed() {
  const g = ++_feedGeracao
  _feedAgendado = false
  _feedTablets = []
  _feedMeusAnun = null
  _feedNomes = {}
  _feedRegs = {}
  _feedHoje = _feedData()
  const anuncianteId = (typeof ESCOPO !== 'undefined') && ESCOPO.anuncianteId
  if (!anuncianteId) return

  try {
    const res = await resolverVeiculacao(anuncianteId, () => g === _feedGeracao)
    if (!res) return                       // invalidado (troca de usuário/logout)
    _feedTablets  = res.tablets
    _feedMeusAnun = res.anuncioIds
    _feedNomes    = res.anuncios

    if (!_feedTablets.length) { _feedRecompor(g); return }  // sem exibições possíveis

    _feedTablets.forEach(t => {
      const ref = db.ref('rotaads/exibicoes/' + _feedHoje + '/' + t.key)
      const upsert = s => {
        if (g !== _feedGeracao) return
        if (!_feedRegs[t.key]) _feedRegs[t.key] = {}
        _feedRegs[t.key][s.key] = s.val()
        _feedAgendarRecompor(g)
      }
      fbOn(ref, 'child_added', upsert)     // eventos distintos do 'value' do agora → sem colisão
      fbOn(ref, 'child_changed', upsert)
    })

    _feedRecompor(g)  // estado inicial (vazio até chegar o 1º child_added)
  } catch (err) {
    if (typeof mcErro === 'function') mcErro('[anunciante/feed] erro ao carregar exibições', err)
  }
}

function pararFeed() {
  _feedGeracao++
  _feedAgendado = false
  // Remove os listeners de exibições do dia corrente antes de descartar a
  // lista — necessário para a virada de dia (P8) reapontar sem vazar
  // listeners; no logout é redundante-seguro com fbOffTodos.
  _feedTablets.forEach(t => {
    const ref = db.ref('rotaads/exibicoes/' + _feedHoje + '/' + t.key)
    try { fbOff(ref, 'child_added'); fbOff(ref, 'child_changed') } catch (_) {}
  })
  _feedTablets = []
  _feedMeusAnun = null
  _feedRegs = {}
  // Higiene: remove as linhas do DOM para que, na troca de usuário, nenhum
  // dado identificável do anunciante anterior fique retido (mesmo oculto).
  const listaEl = document.getElementById('feed-lista')
  if (listaEl) listaEl.textContent = ''
}
