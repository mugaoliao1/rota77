// Logger central — sem dependências externas
// mcLog(msg)       → info (sempre)
// mcErro(msg, err) → erro (sempre, + console.error)
// mcDebug(msg)     → debug (só se localStorage.mc_debug === '1')
// mcErros()        → retorna array de erros do localStorage

;(function () {
  const KEY = 'mc_log'
  const MAX = 100
  const APP = (location.pathname.split('/').pop() || 'app').replace('.html', '')

  function _salvar(nivel, msg, err) {
    let lista
    try { lista = JSON.parse(localStorage.getItem(KEY) || '[]') } catch (_) { lista = [] }
    const entrada = { t: Date.now(), app: APP, nivel, msg: String(msg).slice(0, 500) }
    if (err) entrada.err = (err && (err.stack || err.message || String(err)) || '').slice(0, 400)
    lista.push(entrada)
    if (lista.length > MAX) lista.splice(0, lista.length - MAX)
    try { localStorage.setItem(KEY, JSON.stringify(lista)) } catch (_) {}
    if (nivel === 'erro') console.error('[MídiaCar/' + APP + ']', msg, err || '')
  }

  window.mcLog   = function (msg)      { _salvar('info',  msg) }
  window.mcErro  = function (msg, err) { _salvar('erro',  msg, err) }
  window.mcDebug = function (msg)      { if (localStorage.getItem('mc_debug') === '1') _salvar('debug', msg) }
  window.mcErros = function ()         {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]').filter(function (e) { return e.nivel === 'erro' }) }
    catch (_) { return [] }
  }

  window.addEventListener('error', function (e) {
    _salvar('erro', e.message + ' @ ' + e.filename + ':' + e.lineno, e.error)
  })
  window.addEventListener('unhandledrejection', function (e) {
    _salvar('erro', 'Unhandled Promise rejection', e.reason)
  })
})()
