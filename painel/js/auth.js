// ── Login e logout — Firebase Authentication ────────────────

// Abre o painel após autenticação confirmada
function _abrirPainel(user) {
  const nomeRaw = user.email.split('@')[0]
  const nome    = nomeRaw.charAt(0).toUpperCase() + nomeRaw.slice(1)
  document.getElementById('login-page').style.display = 'none'
  document.getElementById('app').style.display        = 'block'
  document.getElementById('sidebar-nome').textContent  = nome
  document.getElementById('sidebar-avatar').textContent = nome.charAt(0).toUpperCase()
  if (typeof iniciarEscuta === 'function') iniciarEscuta()
}

// Monitora estado de autenticação — também restaura sessão após reload
firebase.auth().onAuthStateChanged(user => {
  if (user) {
    _abrirPainel(user)
  } else {
    document.getElementById('login-page').style.display = 'flex'
    document.getElementById('app').style.display        = 'none'
    fbOffTodos()
  }
})

async function fazerLogin() {
  const u = document.getElementById('login-user').value.trim().toLowerCase()
  const p = document.getElementById('login-pass').value
  if (!u || !p) { document.getElementById('erro-login').style.display = 'block'; return }
  try {
    await firebase.auth().signInWithEmailAndPassword(u, p)
    document.getElementById('erro-login').style.display = 'none'
    // onAuthStateChanged cuida da abertura do painel
  } catch (e) {
    console.error('[painel/auth] erro login:', e.code, e.message)
    document.getElementById('erro-login').style.display = 'block'
  }
}

async function sair() {
  fbOffTodos()                      // remove todos os listeners Firebase
  await firebase.auth().signOut()   // encerra sessão server-side
  // onAuthStateChanged cuida de mostrar o login
}
