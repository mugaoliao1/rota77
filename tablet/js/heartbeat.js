// ── Heartbeat de exibição — outbox local e identidade de sessão ─
//
// T1 (infraestrutura, isolada): utilitário de outbox em localStorage
// e esqueleto de identidade de sessão. Nada aqui escreve no Firebase
// ainda — os eventos de heartbeat/exibição chegam nas tarefas
// seguintes (T3+). Este arquivo ainda não é referenciado por nenhum
// HTML (isso é a T2) — carregar aqui não tem nenhum efeito no player.

const HEARTBEAT_ATIVO        = true;   // liga/desliga o recurso inteiro com uma linha
const HEARTBEAT_INTERVALO_MS = 20000;  // frequência do heartbeat (usado a partir da T4)
const HEARTBEAT_OUTBOX_MAX   = 500;    // cap de itens pendentes no outbox

const HEARTBEAT_OUTBOX_KEY = 'rotaads_heartbeat_outbox';

// Identidade da sessão atual — uma por carregamento do app.
// Gravada no Firebase a partir da T3; usada para deduplicar eventos a partir da T7/T9.
const _heartbeatSessionId = (typeof crypto !== 'undefined' && crypto.randomUUID)
  ? crypto.randomUUID()
  : 'sess_' + Date.now() + '_' + Math.random().toString(36).slice(2);

let _heartbeatSeq = 0; // contador monotônico de eventos dentro da sessão (usado a partir da T7)

// ── Outbox local ──────────────────────────────────────────────
// Sobrevive a queda de energia, não só de sinal — o SDK do Firebase
// só enfileira escritas em memória enquanto offline.
// Cada item: { id, path, valor, criadoEm }

function _outboxLer() {
  try {
    return JSON.parse(localStorage.getItem(HEARTBEAT_OUTBOX_KEY) || '[]');
  } catch (_) {
    return [];
  }
}

function _outboxGravar(lista) {
  try {
    localStorage.setItem(HEARTBEAT_OUTBOX_KEY, JSON.stringify(lista));
  } catch (_) {
    // localStorage cheio ou indisponível — falha silenciosa, mesmo padrão do shared/js/logger.js
  }
}

function _outboxSalvar(path, valor) {
  // Só a versão mais recente de cada path deve ficar pendente — toda escrita
  // aqui é .set() (sobrescreve inteiro), então uma entrada mais antiga pro
  // mesmo caminho nunca precisa sobreviver a uma mais nova.
  const lista = _outboxLer().filter(item => item.path !== path);
  const id = Date.now() + '_' + Math.random().toString(36).slice(2);
  lista.push({ id, path, valor, criadoEm: Date.now() });
  if (lista.length > HEARTBEAT_OUTBOX_MAX) lista.splice(0, lista.length - HEARTBEAT_OUTBOX_MAX);
  _outboxGravar(lista);
  return id;
}

function _outboxRemover(id) {
  _outboxGravar(_outboxLer().filter(item => item.id !== id));
}

function _outboxListar() {
  return _outboxLer();
}

// Grava no outbox primeiro, tenta o Firebase em seguida; só remove do
// outbox após confirmação de escrita. Usada por toda escrita do heartbeat
// (sessão e tick) — se offline ou se a escrita falhar, o item permanece
// no outbox até o próximo _outboxFlush().
// ServerValue.TIMESTAMP é só um objeto simples ({ ".sv": "timestamp" }),
// sobrevive normalmente a JSON.stringify/parse dentro do outbox.
function _heartbeatEscrever(path, valor) {
  const outboxId = _outboxSalvar(path, valor);
  try {
    db.ref(path).set(valor)
      .then(function () { _outboxRemover(outboxId); })
      .catch(function (err) {
        if (typeof mcErro === 'function') mcErro('[heartbeat] falha ao gravar ' + path, err);
      });
  } catch (err) {
    if (typeof mcErro === 'function') mcErro('[heartbeat] erro ao gravar ' + path, err);
  }
}

// Reenvia tudo que ficou pendente no outbox — chamada ao reconectar.
function _outboxFlush() {
  _outboxListar().forEach(function (item) {
    try {
      db.ref(item.path).set(item.valor)
        .then(function () { _outboxRemover(item.id); })
        .catch(function (err) {
          if (typeof mcErro === 'function') mcErro('[heartbeat] falha ao reenviar outbox', err);
        });
    } catch (err) {
      if (typeof mcErro === 'function') mcErro('[heartbeat] erro ao reenviar outbox', err);
    }
  });
}

// ── Sanitização de chave ─────────────────────────────────────
// tabletId é texto livre (tela de config, sem validação — ui.js) e,
// a partir da T3, passou a ser usado como chave de caminho no Firebase,
// não só como valor de busca. Chaves do Firebase não aceitam . # $ [ ]
// — troca por "_" só na hora de montar o caminho; não altera o
// tabletId original salvo/configurado.

function _heartbeatKey(valor) {
  return String(valor).replace(/[.#$\[\]]/g, '_');
}

// ── Sessão ────────────────────────────────────────────────────
// Um nó por carregamento do app — usado depois para calcular uptime
// e detectar sessão órfã. Passa pelo outbox (_heartbeatEscrever, T5);
// falha aqui não deve impedir o boot do player.

function _sessaoIniciar() {
  if (!HEARTBEAT_ATIVO || !tabletId) return;
  _heartbeatEscrever('rotaads/sessoes/' + _heartbeatKey(tabletId) + '/' + _heartbeatSessionId, {
    iniciadaEmServidor: firebase.database.ServerValue.TIMESTAMP,
    iniciadaEmDevice: Date.now()
  });
}

// ── Status ────────────────────────────────────────────────────
// Atualizado por stability.js via Page Visibility (_pausarPlayer/
// _retomarPlayer, T6) — diferencia "app em background" de "travado".
let _heartbeatStatusAtual = 'exibindo';

function _heartbeatStatus(status) {
  _heartbeatStatusAtual = status;
}

// ── Heartbeat periódico ──────────────────────────────────────
// Nó único por tablet, sempre sobrescrito (.set()) — não é log, é
// "estado atual". Passa pelo outbox (_heartbeatEscrever, T5).

function _heartbeatTick() {
  if (!HEARTBEAT_ATIVO || !tabletId) return;
  _heartbeatEscrever('rotaads/heartbeats/' + _heartbeatKey(tabletId), {
    tabletId: tabletId,
    sessionId: _heartbeatSessionId,
    status: _heartbeatStatusAtual,
    ultimoHeartbeatServidor: firebase.database.ServerValue.TIMESTAMP,
    ultimoHeartbeatDevice: Date.now()
  });
}

// ── Exibição — evento de início e conclusão (T7 + T8 + T9) ───
// Um único registro por exibição, na chave determinística
// {sessionId}_{seq} — _exibicaoIniciar() grava a abertura via
// _heartbeatEscrever (outbox, T5); _exibicaoConcluir() grava de novo
// no MESMO caminho, com o payload de abertura + fechamento mesclados
// em memória, então o registro final fica completo mesmo que as duas
// escritas cheguem em momentos diferentes (ou uma delas nunca chegue —
// a outra ainda carrega os dois lados). Reenvio do outbox nunca duplica:
// é sempre .set() na mesma chave, nunca um push() novo.

let _exibicaoAtual = null; // { path, payload, iniciadoEmDevice } — exibição aberta aguardando fechamento

function _exibicaoIniciar(anuncio, duracaoPrevistaMs) {
  if (!HEARTBEAT_ATIVO || !tabletId) return;
  _heartbeatSeq++;
  // AAAA-MM-DD no fuso do dispositivo — toISOString() usa UTC e erra a
  // data em ~3h todo dia (Brasil = UTC-3), incompatível com o resto do
  // app, que sempre trabalha em dia-calendário local.
  const agora = new Date();
  const data = agora.getFullYear() + '-' + String(agora.getMonth() + 1).padStart(2, '0') + '-' + String(agora.getDate()).padStart(2, '0');
  const iniciadoEmDevice = Date.now();
  const path = 'rotaads/exibicoes/' + data + '/' + _heartbeatKey(tabletId) + '/' + _heartbeatSessionId + '_' + _heartbeatSeq;
  const payload = {
    tipo: 'anuncio_iniciado',
    anuncioId: anuncio.id,
    campanhaId: anuncio.campanha || null,
    formato: anuncio.tipo || null,
    tabletId: tabletId,
    sessionId: _heartbeatSessionId,
    seq: _heartbeatSeq,
    iniciadoEmServidor: firebase.database.ServerValue.TIMESTAMP,
    iniciadoEmDevice: iniciadoEmDevice,
    duracaoPrevistaMs: duracaoPrevistaMs
  };
  _heartbeatEscrever(path, payload);
  _exibicaoAtual = { path: path, payload: payload, iniciadoEmDevice: iniciadoEmDevice };
}

function _exibicaoConcluir(motivoFim, sinais) {
  if (!_exibicaoAtual) return; // nada aberto (ou já foi fechado) — evita registrar duas vezes
  const aberta = _exibicaoAtual;
  _exibicaoAtual = null;
  const payloadFinal = Object.assign({}, aberta.payload, {
    tipo: motivoFim === 'erro_playback' ? 'erro_playback' : 'anuncio_concluido',
    motivoFim: motivoFim,
    duracaoRealMs: Date.now() - aberta.iniciadoEmDevice,
    concluidoEmServidor: firebase.database.ServerValue.TIMESTAMP,
    sinais: sinais || {}
  });
  _heartbeatEscrever(aberta.path, payloadFinal);
}

// O disparo imediato (pra aparecer online sem esperar os 20s iniciais) é
// chamado por main.js, depois que tabletId existe (state.js já rodou) —
// chamá-lo aqui, no load do próprio heartbeat.js, lança ReferenceError
// porque este script roda antes de state.js declarar `let tabletId`.
if (HEARTBEAT_ATIVO) setInterval(_heartbeatTick, HEARTBEAT_INTERVALO_MS);
