// ── Portal do Anunciante — login e logout (P2 + gate de papel P3) ──
// Firebase Authentication real (e-mail/senha) — mesmo padrão do
// painel/js/auth.js. Nenhuma leitura de dados além do papel (P4 traz o resto).

firebase.auth().languageCode = 'pt-BR'  // e-mails de redefinição em português

// P3/P4: lê rotaads/usuarios/{uid} uma vez e devolve o registro (ou null).
// Falha na leitura (regra/rede) devolve null — nunca abre na dúvida.
async function _lerUsuario(user) {
  try {
    const snap = await firebase.database().ref('rotaads/usuarios/' + user.uid).once('value')
    return snap.val() || null
  } catch (err) {
    if (typeof mcErro === 'function') mcErro('[anunciante/auth] erro ao ler usuário', err)
    return null
  }
}

// Alterna login ⇄ app conforme o estado de autenticação.
// Também restaura a sessão após reload (persistência padrão do SDK).
firebase.auth().onAuthStateChanged(async user => {
  if (user) {
    const rec = await _lerUsuario(user)
    // P3: papel/ativo. P4: resolve o anunciante vinculado (escopo.js).
    if (!(rec && rec.papel === 'anunciante' && rec.ativo === true)) {
      _loginMsg('Sua conta não tem acesso ao Portal do Anunciante. Fale com a gestão.')
      await firebase.auth().signOut()
      return
    }
    const escopoOk = (typeof resolverEscopo === 'function') && await resolverEscopo(rec)
    if (!escopoOk) {
      _loginMsg('Sua conta ainda não está vinculada a um anunciante. Fale com a gestão.')
      await firebase.auth().signOut()
      return
    }
    document.getElementById('login-page').style.display = 'none'
    document.getElementById('app').style.display        = 'block'
    if (typeof iniciarSelo === 'function') iniciarSelo()   // P5: selo NO AR
    if (typeof iniciarAgora === 'function') iniciarAgora() // P6: Transmitindo agora
    if (typeof iniciarFeed === 'function') iniciarFeed()   // P7: feed de exibições
    if (typeof iniciarRelogio === 'function') iniciarRelogio() // P8: virada de meia-noite
    if (typeof iniciarConexao === 'function') iniciarConexao()  // P9: estado de conexão do portal
  } else {
    document.getElementById('login-page').style.display = 'flex'
    document.getElementById('app').style.display        = 'none'
    document.getElementById('login-senha').value        = ''   // higiene em dispositivo compartilhado
    if (typeof pararSelo === 'function') pararSelo()        // invalida cargas em voo ANTES de remover listeners
    if (typeof pararAgora === 'function') pararAgora()
    if (typeof pararFeed === 'function') pararFeed()
    if (typeof pararRelogio === 'function') pararRelogio()
    if (typeof pararConexao === 'function') pararConexao()
    if (typeof limparEscopo === 'function') limparEscopo()
    if (typeof fbOffTodos === 'function') fbOffTodos()
  }
})

function _loginMsg(erro, info) {
  const e = document.getElementById('login-erro')
  const i = document.getElementById('login-info')
  e.style.display = erro ? 'block' : 'none'
  if (erro) e.textContent = erro
  i.style.display = info ? 'block' : 'none'
  if (info) i.textContent = info
}

async function fazerLogin() {
  const email = document.getElementById('login-email').value.trim().toLowerCase()
  const senha = document.getElementById('login-senha').value
  if (!email || !senha) { _loginMsg('Preencha e-mail e senha.'); return }
  try {
    await firebase.auth().signInWithEmailAndPassword(email, senha)
    _loginMsg(null, null)
    // onAuthStateChanged cuida de abrir o app
  } catch (err) {
    if (typeof mcErro === 'function') mcErro('[anunciante/auth] erro login', err)
    _loginMsg('E-mail ou senha incorretos.')
  }
}

async function recuperarSenha() {
  const email = document.getElementById('login-email').value.trim().toLowerCase()
  if (!email) { _loginMsg('Digite seu e-mail no campo acima para recuperar a senha.'); return }
  try {
    await firebase.auth().sendPasswordResetEmail(email)
    _loginMsg(null, 'Enviamos um link de redefinição para ' + email + '.')
  } catch (err) {
    if (typeof mcErro === 'function') mcErro('[anunciante/auth] erro recuperar senha', err)
    _loginMsg('Não foi possível enviar o e-mail de recuperação. Confira o endereço.')
  }
}

async function sair() {
  if (typeof fbOffTodos === 'function') fbOffTodos()  // remove listeners antes de perder a sessão
  _loginMsg(null, null)                               // limpa mensagens de sessões anteriores
  document.getElementById('login-email').value = ''
  document.getElementById('login-senha').value = ''
  await firebase.auth().signOut()
  // onAuthStateChanged cuida de mostrar o login
}
