// ── Registro central de listeners Firebase ───────────────────
// Garante: sem duplicatas, cleanup total no logout
//
// API:
//   fbOn(ref, evento, callback [, onError]) — registra com deduplicação
//   fbOff(ref, evento)                      — remove listener específico
//   fbOffTodos()                            — remove todos (chamar no logout)

const _fbListeners = []

function fbOn(ref, evento, callback, onError) {
  const path = ref.toString()
  // Remove listener anterior no mesmo nó+evento antes de re-attachar
  const idx = _fbListeners.findIndex(r => r.path === path && r.evento === evento)
  if (idx !== -1) {
    _fbListeners[idx].ref.off(evento, _fbListeners[idx].callback)
    _fbListeners.splice(idx, 1)
  }
  if (onError) ref.on(evento, callback, onError)
  else ref.on(evento, callback)
  _fbListeners.push({ ref, path, evento, callback })
}

function fbOff(ref, evento) {
  const path = ref.toString()
  const idx = _fbListeners.findIndex(r => r.path === path && r.evento === evento)
  if (idx !== -1) {
    _fbListeners[idx].ref.off(evento, _fbListeners[idx].callback)
    _fbListeners.splice(idx, 1)
  }
}

function fbOffTodos() {
  _fbListeners.forEach(({ ref, evento, callback }) => {
    try { ref.off(evento, callback) } catch (_) {}
  })
  _fbListeners.length = 0
}
