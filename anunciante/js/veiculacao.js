// ── Portal do Anunciante — resolução da cadeia de veiculação ──
//
// Lógica comum ao selo (P5) e ao "Transmitindo agora" (P6),
// extraída para um único lugar: dado um anuncianteId, resolve
// campanhas → anúncios ativos → tablets que os exibem, e devolve
// tudo o que os consumidores precisam.
//
// A proteção de geração continua em cada consumidor: passe um
// predicado `estaValido()` — resolverVeiculacao o verifica após cada
// leitura e devolve null se a geração ficou obsoleta (mesmos pontos
// de aborto de antes). Também devolve null se anuncianteId for falsy.

// Sanitização de chave do RTDB — chaves não aceitam . # $ [ ].
// DEVE permanecer em sincronia com _heartbeatKey (tablet/js/heartbeat.js).
function veiculacaoKey(valor) {
  return String(valor).replace(/[.#$\[\]]/g, '_')
}

// Resolve a cadeia. Retorno:
//   { tablets: [{ nome, key, motorista }], anuncioIds: Set, anuncios: { id: {nome, url} } }
// ou null (invalidado / sem anunciante).
async function resolverVeiculacao(anuncianteId, estaValido) {
  if (!anuncianteId) return null

  // 1. Campanhas do anunciante (campo dual anunciante/anuncianteId, como no resto do projeto)
  const campSnap = await db.ref('rotaads/campanhas').once('value')
  if (estaValido && !estaValido()) return null
  const campanhas = campSnap.val() || {}
  const campanhaIds = Object.entries(campanhas)
    .filter(([, c]) => c && (c.anunciante === anuncianteId || c.anuncianteId === anuncianteId))
    .map(([id]) => id)

  // 2. Anúncios ativos dessas campanhas
  const anunSnap = await db.ref('rotaads/anuncios').once('value')
  if (estaValido && !estaValido()) return null
  const anuncios = anunSnap.val() || {}
  const anuncioIds = new Set()
  const anunciosInfo = {}
  Object.entries(anuncios).forEach(([id, a]) => {
    if (a && campanhaIds.indexOf(a.campanha) !== -1 && a.status === 'ativo') {
      anuncioIds.add(id)
      anunciosInfo[id] = { nome: a.nome || '', url: a.url || '' }
    }
  })

  // 3. Tablets ativos que exibem ao menos um desses anúncios
  const tabSnap = await db.ref('rotaads/tablets').once('value')
  if (estaValido && !estaValido()) return null
  const tablets = tabSnap.val() || {}
  const listaTablets = Object.values(tablets)
    .filter(t => t && t.status === 'ativo' && t.anuncios &&
      Object.keys(t.anuncios).some(aid => anuncioIds.has(aid)))
    .map(t => ({ nome: t.nome || '', key: veiculacaoKey(t.nome || ''), motorista: t.motorista || '' }))

  return { tablets: listaTablets, anuncioIds: anuncioIds, anuncios: anunciosInfo }
}
