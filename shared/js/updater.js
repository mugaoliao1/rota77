// Detecta atualização do Service Worker e recarrega quando seguro
// Usado em portal e painel. Tablet tem lógica própria em stability.js.

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', function (event) {
    if (event.data && event.data.type === 'SW_UPDATED') {
      _agendarReloadSeguro()
    }
  })
}

function _agendarReloadSeguro() {
  if (!_estaEditando()) {
    window.location.reload()
    return
  }
  // Usuário está em um campo — aguarda sair para recarregar
  function handler() {
    if (!_estaEditando()) {
      document.removeEventListener('focusout', handler)
      window.location.reload()
    }
  }
  document.addEventListener('focusout', handler)
}

function _estaEditando() {
  var el = document.activeElement
  if (!el) return false
  var tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable
}
