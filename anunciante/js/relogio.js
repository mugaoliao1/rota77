// ── Portal do Anunciante — virada de meia-noite (P8) ─────────
//
// O selo NÃO depende de data (heartbeats não são datados) — fica
// intocado na virada. Apenas o "Transmitindo agora" e o feed olham
// exibicoes/{hoje}/… : quando a data LOCAL muda, eles são parados
// (removendo os listeners do dia anterior + limpando estado) e
// reiniciados, reapontando para o novo dia.
//
// Detecção por verificação periódica (não por timeout exato à meia-
// noite): robusta a suspensão do dispositivo e ajustes de relógio.
// Latência de virada ≤ 30s.

let _relogioDia   = ''
let _relogioTimer = null

function _relogioData() {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function _relogioVerificar() {
  const hoje = _relogioData()
  if (hoje === _relogioDia) return
  _relogioDia = hoje
  // Reaponta agora e feed para o novo dia. parar* remove os listeners do
  // dia anterior e limpa o estado; iniciar* reanexa ao dia atual (e
  // rebumpa a geração, invalidando qualquer callback antigo em voo).
  // O selo é deixado como está — independente de data.
  if (typeof pararAgora === 'function') pararAgora()
  if (typeof pararFeed === 'function') pararFeed()
  if (typeof iniciarAgora === 'function') iniciarAgora()
  if (typeof iniciarFeed === 'function') iniciarFeed()
}

function iniciarRelogio() {
  if (_relogioTimer) { clearInterval(_relogioTimer); _relogioTimer = null }  // idempotência
  _relogioDia = _relogioData()
  _relogioTimer = setInterval(_relogioVerificar, 30000)
}

function pararRelogio() {
  if (_relogioTimer) { clearInterval(_relogioTimer); _relogioTimer = null }
}
