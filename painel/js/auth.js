// ── Login e logout — Firebase Authentication ────────────────

firebase.auth().languageCode = 'pt-BR'

// P3: o painel só abre para papel "gestor" ativo (rotaads/usuarios/{uid}).
// Falha na leitura (regra/rede) nega por padrão — nunca abre na dúvida.
async function _ehGestorAtivo(user) {
  try {
    const snap = await db.ref('rotaads/usuarios/' + user.uid).once('value')
    const u = snap.val()
    return !!(u && u.papel === 'gestor' && u.ativo === true)
  } catch (e) {
    console.error('[painel/auth] erro ao verificar papel:', e)
    return false
  }
}

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
firebase.auth().onAuthStateChanged(async user => {
  if (user) {
    if (await _ehGestorAtivo(user)) {
      _abrirPainel(user)
    } else {
      // conta autenticada sem papel de gestor ativo — nega e encerra sessão
      const erro = document.getElementById('erro-login')
      erro.textContent = 'Esta conta não tem acesso ao painel.'
      erro.style.display = 'block'
      await firebase.auth().signOut()
    }
  } else {
    document.getElementById('login-page').style.display = 'flex'
    document.getElementById('app').style.display        = 'none'
    fbOffTodos()
  }
})

function _erroLoginPadrao() {
  const erro = document.getElementById('erro-login')
  erro.textContent = 'Usuário ou senha incorretos.'  // restaura texto padrão (o gate de papel pode tê-lo alterado)
  erro.style.display = 'block'
}

async function fazerLogin() {
  const u = document.getElementById('login-user').value.trim().toLowerCase()
  const p = document.getElementById('login-pass').value
  if (!u || !p) { _erroLoginPadrao(); return }
  try {
    await firebase.auth().signInWithEmailAndPassword(u, p)
    document.getElementById('erro-login').style.display = 'none'
    // onAuthStateChanged cuida da abertura do painel
  } catch (e) {
    console.error('[painel/auth] erro login:', e.code, e.message)
    _erroLoginPadrao()
  }
}

async function sair() {
  fbOffTodos()                      // remove todos os listeners Firebase
  await firebase.auth().signOut()   // encerra sessão server-side
  // onAuthStateChanged cuida de mostrar o login
}
