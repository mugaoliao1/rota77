// Teste do transform puro — SEM Firebase, SEM DOM real.
// Roda o parsearCSV REAL (painel/js/csv.js, via vm) contra um CSV sintético
// no formato Machine App e valida o payload do contrato consolidado.
//
// Uso: node contrato/test-transform.cjs

const fs = require('fs');
const path = require('path');
const vm = require('vm');

// 1) Carrega o parsearCSV REAL num sandbox. csv.js só declara funções no topo
//    (sem execução de DOM), então parsearCSV fica disponível no contexto.
const csvSrc = fs.readFileSync(path.join(__dirname, '..', 'painel', 'js', 'csv.js'), 'utf8');
const sandbox = { console: { log() {}, error() {}, warn() {} } };
vm.createContext(sandbox);
try { vm.runInContext(csvSrc, sandbox); } catch (e) { /* funções são hoisted; segue */ }
const parsearCSV = sandbox.parsearCSV;
if (typeof parsearCSV !== 'function') { console.error('FALHA: parsearCSV não carregou do csv.js'); process.exit(1); }

// 2) Carrega o transform puro. O arquivo é um script clássico que se expõe
//    via global (como no browser); requerê-lo executa a IIFE e popula
//    globalThis.ContratoConsolidado, independente de CJS/ESM.
require('./transform-consolidado.js');
const T = globalThis.ContratoConsolidado;
if (!T || typeof T.montarPayloadConsolidado !== 'function') { console.error('FALHA: transform não carregou'); process.exit(1); }

// 3) CSV sintético (formato Machine App). 2 dias, mix de status para provar
//    que só corridas 'Finalizada' contam.
const csv = [
  'Status;Momento da Solicitação;Distância do Início;Tempo do Início;Motorista;Passageiro;Motivo',
  'Finalizada;04/07/2026 08:15:00;3,2;10;João Silva;Ana;',
  'Finalizada;04/07/2026 09:00:00;5,0;15;João Silva;Bruno;',
  'Finalizada;04/07/2026 10:30:00;2,1;8;Maria Souza;Carlos;',
  'Cancelada;04/07/2026 11:00:00;0;0;Maria Souza;Diego;desistencia',   // NÃO conta
  'Finalizada;05/07/2026 07:45:00;4,4;12;João Silva;Elena;',
  'Cancelada;05/07/2026 08:00:00;0;0;João Silva;Fabio;',               // NÃO conta
].join('\n');

const resultado = parsearCSV(csv);

// 4) Transforma (processadoEm fixo → determinismo no teste).
const opcoes = { origemArquivo: 'corridas_teste.csv', processadoEm: 1720000000000, status: 'ok', linhasProcessadas: 6 };
const payload = T.montarPayloadConsolidado(resultado, opcoes);

// 5) Asserções.
let ok = true;
function check(cond, msg) { if (!cond) { ok = false; console.error('  ✗ ' + msg); } else { console.log('  ✓ ' + msg); } }

console.log('--- estrutura ---');
check(Object.keys(payload).length === 2, '2 dias no payload');
const d04 = payload['2026-07-04'], d05 = payload['2026-07-05'];
check(!!d04 && !!d05, 'chaves de data em ISO YYYY-MM-DD (2026-07-04 / 2026-07-05)');

console.log('--- corridas = SOMENTE finalizadas ---');
check(d04.resumo.corridas === 3, '04/07 resumo.corridas = 3 (João 2 + Maria 1; cancelada excluida)');
check(d05.resumo.corridas === 1, '05/07 resumo.corridas = 1 (cancelada do João excluida)');

console.log('--- resumo (km, tempo_min) ---');
check(d04.resumo.tempo_min === 33, '04/07 resumo.tempo_min = 33 (10+15+8)');
check(typeof d04.resumo.km === 'number' && d04.resumo.km > 0, '04/07 resumo.km é number > 0 (=' + d04.resumo.km + ')');

console.log('--- motoristas: nome obrigatório + chave opaca ---');
check(Object.keys(d04.motoristas).length === 2, '04/07 tem 2 motoristas (João, Maria)');
const kJoao = Object.keys(d04.motoristas).find(k => d04.motoristas[k].nome === 'João Silva');
check(kJoao === 'Joao_Silva', 'chave opaca sanitizada = "Joao_Silva" (sem acento, espaço->_)');
check(d04.motoristas[kJoao].corridas === 2, 'João 04/07 corridas = 2');
check(!!d04.motoristas[kJoao].nome, 'nome obrigatório presente em cada motorista');
check(Object.keys(d05.motoristas).length === 1, '05/07 só tem João (Maria sem finalizada nesse dia)');

console.log('--- _meta obrigatórios ---');
['schemaVersion', 'processadoEm', 'origemArquivo', 'status'].forEach(f => {
  check(d04._meta[f] !== undefined, '_meta.' + f + ' presente');
});
check(d04._meta.schemaVersion === 'v1', '_meta.schemaVersion = "v1"');
check(d04._meta.origemArquivo === 'corridas_teste.csv', '_meta.origemArquivo correto');
check(d04._meta.geradoPor === undefined, '_meta.geradoPor ausente (recomendado, não fornecido)');

console.log('--- idempotência por data ---');
const payload2 = T.montarPayloadConsolidado(resultado, opcoes);
check(JSON.stringify(payload2['2026-07-04'].resumo) === JSON.stringify(d04.resumo), 'resumo idêntico na 2ª execução');
check(JSON.stringify(payload2['2026-07-04'].motoristas) === JSON.stringify(d04.motoristas), 'motoristas idêntico na 2ª execução');

console.log('--- caminho de destino ---');
check(T.caminhoConsolidado('2026-07-04') === 'rotaads/consolidado/v1/dias/2026-07-04', 'caminho = rotaads/consolidado/v1/dias/2026-07-04');

console.log('--- default SERVER_TIMESTAMP (sem processadoEm) ---');
const pDefault = T.montarPayloadConsolidado(resultado, { origemArquivo: 'x.csv' });
check(JSON.stringify(pDefault['2026-07-04']._meta.processadoEm) === JSON.stringify({ '.sv': 'timestamp' }), 'processadoEm default = sentinela {".sv":"timestamp"}');

console.log('--- AJUSTE 1: colisão de chave (João Silva / Joao Silva) ---');
const csvColisao = [
  'Status;Momento da Solicitação;Distância do Início;Tempo do Início;Motorista;Passageiro;Motivo',
  'Finalizada;11/07/2026 08:00:00;2,0;10;João Silva;Ana;',
  'Finalizada;11/07/2026 09:00:00;3,0;10;Joao Silva;Bruno;',   // nome distinto -> mesma chave opaca
].join('\n');
const pCol = T.montarPayloadConsolidado(parsearCSV(csvColisao), { origemArquivo: 'col.csv', processadoEm: 1 });
const dCol = pCol['2026-07-11'];
check(Object.keys(dCol.motoristas).length === 1, 'colisão: 1 chave (mesclada), sem sobrescrita');
const kCol = Object.keys(dCol.motoristas)[0];
check(dCol.motoristas[kCol].corridas === 2, 'colisão: corridas mescladas (1+1=2), nada perdido');
check(dCol.motoristas[kCol].km === 5, 'colisão: km mesclado (2+3=5)');
check(dCol.motoristas[kCol].nome === 'João Silva', 'colisão: primeiro nome preservado como principal');
check(Array.isArray(dCol.motoristas[kCol].aliases) && dCol.motoristas[kCol].aliases.indexOf('Joao Silva') !== -1, 'colisão: alias "Joao Silva" registrado');
const wCol = (dCol._meta.warnings || []).find(w => w.tipo === 'colisao_chave');
check(!!wCol && wCol.chave === kCol, 'colisão: warning colisao_chave em _meta.warnings');
check(dCol._meta.status === 'parcial', 'colisão: _meta.status = "parcial"');

console.log('--- AJUSTE 2: corrida finalizada SEM motorista ---');
const csvSemMot = [
  'Status;Momento da Solicitação;Distância do Início;Tempo do Início;Motorista;Passageiro;Motivo',
  'Finalizada;12/07/2026 08:00:00;1,0;5;Diego Alves;Ana;',
  'Finalizada;12/07/2026 09:00:00;2,0;5;;Bruno;',   // motorista vazio
].join('\n');
const pSem = T.montarPayloadConsolidado(parsearCSV(csvSemMot), { origemArquivo: 'sem.csv', processadoEm: 1 });
const dSem = pSem['2026-07-12'];
check(dSem.resumo.corridas === 2, 'sem-motorista: resumo.corridas = 2 (não alterado)');
check(Object.values(dSem.motoristas).reduce((a, m) => a + m.corridas, 0) === 1, 'sem-motorista: soma atribuída = 1');
const wSem = (dSem._meta.warnings || []).find(w => w.tipo === 'corridas_sem_motorista');
check(!!wSem && wSem.corridasSemMotorista === 1, 'sem-motorista: warning corridas_sem_motorista (=1)');
check(dSem._meta.status === 'ok', 'sem-motorista: status permanece "ok" (não é colisão)');
check(Object.keys(dSem.motoristas).length === 1, 'sem-motorista: nenhum motorista inventado');

console.log('--- AJUSTE 3: cancelada com km/tempo ≠ 0 NÃO entra no resumo ---');
const csvCancKm = [
  'Status;Momento da Solicitação;Distância do Início;Tempo do Início;Motorista;Passageiro;Motivo',
  'Finalizada;13/07/2026 08:00:00;1,0;1;Carlos Lima;Ana;',
  'Cancelada;13/07/2026 09:00:00;9,9;99;Carlos Lima;Bruno;desistencia',  // km/tempo altos, mas cancelada
].join('\n');
const pCanc = T.montarPayloadConsolidado(parsearCSV(csvCancKm), { origemArquivo: 'canc.csv', processadoEm: 1 });
const dCanc = pCanc['2026-07-13'];
check(dCanc.resumo.corridas === 1, 'cancelada km≠0: resumo.corridas = 1 (cancelada excluída)');
check(dCanc.resumo.km === 1, 'cancelada km≠0: resumo.km = 1 (não 10.9 — cancelada não soma km)');
check(dCanc.resumo.tempo_min === 1, 'cancelada km≠0: resumo.tempo_min = 1 (não 100 — cancelada não soma tempo)');

// 6) Exemplo de payload — pronto para set() (SEM escrever nada).
console.log('\n=== EXEMPLO DE PAYLOAD (2026-07-04) — pronto para set(), NÃO escrito ===');
const exemplo = {};
exemplo[T.caminhoConsolidado('2026-07-04')] = payload['2026-07-04'];
console.log(JSON.stringify(exemplo, null, 2));

console.log('\n' + (ok ? 'TODOS OS TESTES PASSARAM ✅' : 'HÁ FALHAS ✗'));
process.exit(ok ? 0 : 1);
