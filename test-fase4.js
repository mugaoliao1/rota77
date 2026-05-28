'use strict';
// ─────────────────────────────────────────────────────────────────────────────
// test-fase4.js  —  Validação das Fases 3 e 4 com CSV real do Rota 77
// Executa os módulos de query engine + contexto em Node.js (sem browser/Firebase)
// node test-fase4.js
// ─────────────────────────────────────────────────────────────────────────────

const fs = require('fs');

// ── 1. Mock do ambiente browser ───────────────────────────────────────────────
global.window   = {};
global.dadosImportados = null;

// Captura HTML gerado pelas queries
const respostas = [];
let lastInput   = '';   // controlado pelos testes

function mockEl(overrides) {
  return {
    innerHTML:'', style:{}, value:'',
    firstChild:null, children:[],
    remove:()=>{}, scrollIntoView:()=>{},
    setAttribute:()=>{}, getAttribute:()=>null,
    insertBefore:()=>{},
    ...overrides,
  };
}

global.document = {
  // createElement necessário para exibirResposta (Phase 3)
  createElement: (tag) => {
    const el = mockEl({ tagName:(tag||'div').toUpperCase() });
    // Captura innerHTML quando o elemento é inserido no historico
    return el;
  },
  getElementById: (id) => {
    if (id === 'qe-historico') return mockEl({
      insertBefore: (el) => { respostas.push(el.innerHTML || ''); },
      scrollIntoView: () => {},
    });
    if (id === 'qe-input')       return { value: lastInput, focus: () => {} };
    if (id === 'qe-placeholder') return null;   // não encontrado → sem .remove()
    return mockEl();                             // qe-ctx-painel e outros
  },
};

// ── 2. Parser CSV — cópia exata do csv.js ────────────────────────────────────
function parsearCSV(texto) {
  const linhas = texto.split('\n');
  if (linhas.length < 2) throw new Error('Arquivo vazio');
  const sep = linhas[0].includes(';') ? ';' : ',';
  const headers = linhas[0].split(sep).map(h => h.trim().replace(/"/g,''));

  const idxStatus     = headers.findIndex(h => h.toLowerCase().includes('status'));
  const idxMomento    = headers.findIndex(h => h.toLowerCase().includes('momento da solicita'));
  const idxDistancia  = headers.findIndex(h =>
    h.toLowerCase().includes('distância do início') ||
    h.toLowerCase().includes('distancia do inicio'));
  const idxTempo      = headers.findIndex(h =>
    h.toLowerCase().includes('tempo do início') ||
    h.toLowerCase().includes('tempo do inicio'));
  const idxMotorista  = headers.findIndex(h => h.toLowerCase() === 'motorista');
  const idxPassageiro = headers.findIndex(h => /passageiro|usu[aá]rio|cliente/.test(h.toLowerCase()));
  const idxMotivo     = headers.findIndex(h => h.toLowerCase().includes('motivo'));

  const metricas = {}, motoristas = {}, metricasPorMotorista = {}, todasCorridas = [];

  for (let i = 1; i < linhas.length; i++) {
    const linha = linhas[i].trim();
    if (!linha) continue;
    const cols = linha.split(sep);
    const statusRaw  = (cols[idxStatus]||'').trim().replace(/"/g,'');
    const statusNorm = statusRaw.toLowerCase();
    const momentoRaw = idxMomento >= 0 ? (cols[idxMomento]||'').trim().replace(/"/g,'') : '';
    if (!momentoRaw) continue;
    const pm = momentoRaw.split(' ');
    const partes = pm[0].split('/');
    if (partes.length < 3) continue;
    const data = `${partes[2]}-${partes[1].padStart(2,'0')}-${partes[0].padStart(2,'0')}`;
    const hora = parseInt((pm[1]||'0').split(':')[0]) || 0;
    const tsStr = `${data}T${pm[1]||'00:00:00'}`;
    const momentoMs = new Date(tsStr).getTime();
    let km = 0;
    if (idxDistancia >= 0) km = parseFloat((cols[idxDistancia]||'0').replace(',','.').trim()) || 0;
    let tempo = 0;
    if (idxTempo >= 0) tempo = parseFloat((cols[idxTempo]||'0').replace(',','.').trim()) || 0;
    const nomeMotorista = idxMotorista  >= 0 ? (cols[idxMotorista] ||'').trim().replace(/"/g,'') : '';
    const passageiro    = idxPassageiro >= 0 ? (cols[idxPassageiro]||'').trim().replace(/"/g,'') : '';
    const motivo        = idxMotivo     >= 0 ? (cols[idxMotivo]    ||'').trim().replace(/"/g,'') : '';

    todasCorridas.push({ statusRaw, statusNorm, data, hora, momentoMs, nomeMotorista, passageiro, motivo, km, tempo });
    if (statusNorm !== 'finalizada') continue;
    if (!metricas[data]) metricas[data] = { corridas:0, km:0, tempo_min:0 };
    metricas[data].corridas++;
    metricas[data].km = Math.round((metricas[data].km + km) * 1000) / 1000;
    metricas[data].tempo_min += tempo;
    if (nomeMotorista) {
      if (!motoristas[nomeMotorista]) motoristas[nomeMotorista] = { corridas:0, km:0 };
      motoristas[nomeMotorista].corridas++;
      motoristas[nomeMotorista].km = Math.round((motoristas[nomeMotorista].km + km) * 1000) / 1000;
      if (!metricasPorMotorista[data]) metricasPorMotorista[data] = {};
      if (!metricasPorMotorista[data][nomeMotorista]) metricasPorMotorista[data][nomeMotorista] = { corridas:0, km:0 };
      metricasPorMotorista[data][nomeMotorista].corridas++;
      metricasPorMotorista[data][nomeMotorista].km = Math.round((metricasPorMotorista[data][nomeMotorista].km + km) * 1000) / 1000;
    }
  }
  Object.keys(metricas).forEach(d => {
    metricas[d].km = Math.round(metricas[d].km * 10) / 10;
    metricas[d].tempo_min = Math.round(metricas[d].tempo_min);
  });
  Object.keys(motoristas).forEach(n => { motoristas[n].km = Math.round(motoristas[n].km * 10) / 10; });
  return { metricas, motoristas, metricasPorMotorista, todasCorridas };
}

// ── 3. Helpers de output ──────────────────────────────────────────────────────
const c = { g:'\x1b[32m', r:'\x1b[31m', y:'\x1b[33m', b:'\x1b[36m', w:'\x1b[37m', d:'\x1b[2m', rst:'\x1b[0m' };
function ok(msg)   { console.log(`  ${c.g}✅${c.rst} ${msg}`); }
function fail(msg) { console.log(`  ${c.r}❌${c.rst} ${msg}`); }
function warn(msg) { console.log(`  ${c.y}⚠️ ${c.rst} ${msg}`); }
function probe(msg){ console.log(`  ${c.b}🔍${c.rst} ${msg}`); }
function head(msg) { console.log(`\n${c.b}── ${msg} ${c.d}${'─'.repeat(Math.max(0,62-msg.length))}${c.rst}`); }
function stripHtml(h){ return h.replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim(); }

let passes=0, fails=0;
function assert(cond, msg, detail='') {
  if (cond) { ok(msg + (detail?` ${c.d}(${detail})${c.rst}`:'')); passes++; }
  else       { fail(msg + (detail?` ${c.d}(${detail})${c.rst}`:'')); fails++; }
  return cond;
}

// ── 4. Carrega engines via eval ───────────────────────────────────────────────
const BASE = 'C:\\Users\\mugao\\OneDrive\\Desktop\\MídiaCar\\dist\\painel\\js\\';
head('Carregando engines');
try {
  eval(fs.readFileSync(BASE + 'operacao-query-engine.js', 'utf8'));
  ok('operacao-query-engine.js carregado');
} catch(e) { fail('operacao-query-engine.js: ' + e.message); process.exit(1); }

try {
  eval(fs.readFileSync(BASE + 'operacao-contexto.js', 'utf8'));
  ok('operacao-contexto.js carregado');
} catch(e) { fail('operacao-contexto.js: ' + e.message); process.exit(1); }

assert(typeof window._qe === 'object',      'window._qe exposto pela Fase 3');
assert(typeof window._qe.dispatch==='function',   '_qe.dispatch disponível');
assert(typeof window._qe.detectarIntencao==='function', '_qe.detectarIntencao disponível');
assert(typeof window.qePerguntar==='function', 'window.qePerguntar disponível (Fase 4 ativada)');
assert(typeof window.qeLimparContexto==='function', 'window.qeLimparContexto disponível');

const { dispatch, detectarIntencao, norm, MESES_MAP, MESES_NOME } = window._qe;

// ── 5. Parsing do CSV real ────────────────────────────────────────────────────
head('Parsing do CSV real (01a22maio.csv)');
const CSV_PATH = 'C:\\Users\\mugao\\Downloads\\01a22maio.csv';
let resultado;
try {
  const texto = fs.readFileSync(CSV_PATH, 'latin1');
  resultado = parsearCSV(texto);
  ok(`CSV lido: ${Math.round(fs.statSync(CSV_PATH).size / 1024)} KB`);
} catch(e) { fail('Erro ao ler CSV: ' + e.message); process.exit(1); }

const { metricas, motoristas, todasCorridas } = resultado;
const datas = Object.keys(metricas).sort();
const totalFin = Object.values(metricas).reduce((a,m)=>a+m.corridas,0);
const totalKm  = Object.values(metricas).reduce((a,m)=>a+m.km,0);

// Status distribution
const statusCount = {};
todasCorridas.forEach(c => { statusCount[c.statusNorm] = (statusCount[c.statusNorm]||0)+1; });
const totalCan = statusCount['cancelada']||0;
const totalNA  = Object.entries(statusCount).filter(([s])=>s.includes('atendid')).reduce((a,[,v])=>a+v,0);
const totalAll = todasCorridas.length;

console.log(`\n  Total solicitações : ${totalAll}`);
console.log(`  Finalizadas        : ${totalFin}`);
console.log(`  Canceladas         : ${totalCan}`);
console.log(`  Não atendidas      : ${totalNA}`);
console.log(`  Período            : ${datas[0]} a ${datas[datas.length-1]} (${datas.length} dias)`);
console.log(`  Motoristas únicos  : ${Object.keys(motoristas).length}`);
console.log(`  Km total           : ${Math.round(totalKm).toLocaleString('pt-BR')} km`);
console.log(`  Status encontrados : ${Object.keys(statusCount).map(s=>`"${s}" (${statusCount[s]})`).join(' | ')}`);

assert(totalAll > 100, `Corridas totais > 100 (${totalAll})`);
assert(totalFin > 0,   `Corridas finalizadas > 0 (${totalFin})`);
assert(Object.keys(motoristas).length >= 3, `Pelo menos 3 motoristas detectados`);
assert(datas.length >= 1, `Pelo menos 1 dia de dados`);

// Verifica hora parsing
const horasDistintas = new Set(todasCorridas.map(c=>c.hora));
assert(horasDistintas.size >= 5, `Horas distribuídas em pelo menos 5 faixas (${horasDistintas.size})`);

// Verifica maçaneta
assert(totalNA > 0 || statusCount['não atendida'] > 0,
  `Corridas maçaneta detectadas (${totalNA})`);

// Define globals para as queries
global.dadosImportados = { ...resultado, arquivo:'01a22maio.csv', timestamp:new Date().toISOString() };

// ── 6. Testes de detecção de intenção ─────────────────────────────────────────
head('Detecção de Intenção (Fase 3)');
const CASOS_INTENT = [
  ['Quem mais cancelou?',                    'RANK_CANCELAMENTOS'],
  ['Qual motorista tem mais cancelamentos?', 'RANK_CANCELAMENTOS'],
  ['Qual a taxa de cancelamento?',           'TAXA_CANCELAMENTO'],
  ['Quando ocorre mais cancelamento?',       'CANCELAMENTO_POR_HORARIO'],
  ['Os cancelamentos estão aumentando?',     'TENDENCIA_CANCELAMENTOS'],
  ['Qual horário tem mais corridas?',        'PICO_HORARIO'],
  ['Qual foi o pico operacional?',           'PICO_HORARIO'],
  ['Quem mais trabalha na madrugada?',       'MADRUGADA'],
  ['Qual motorista tem mais maçaneta?',      'RANK_MACANETA'],
  ['Quem mais finalizou corridas?',          'RANK_FINALIZADAS'],
  ['Como foi o período da manhã?',           'PERIODO_DIA'],
  ['Como foi às 22h?',                       'HORA_ESPECIFICA'],
  ['Compare maio com abril',                 'COMPARAR_PERIODOS'],
  ['Qual o tempo médio de corrida?',         'TEMPO_ESPERA'],
];
CASOS_INTENT.forEach(([q, esperado]) => {
  const intent = detectarIntencao(q);
  assert(intent.tipo === esperado, `"${q}"`, `→ ${intent.tipo}`);
});

// ── 7. Testes de queries reais (com dados reais) ──────────────────────────────
head('Queries com Dados Reais (Fase 3)');

function testarQuery(nomeQuery, intent, validacoes) {
  try {
    const html = dispatch(intent, todasCorridas, metricas, motoristas);
    const texto = stripHtml(html);
    let ok = true;
    validacoes.forEach(([msg, cond]) => {
      if (!assert(cond(texto, html), `${nomeQuery}: ${msg}`)) ok = false;
    });
    return { ok, html, texto };
  } catch(e) {
    fail(`${nomeQuery}: ERRO — ${e.message}`);
    fails++; return { ok:false };
  }
}

// RANK_CANCELAMENTOS
const rCan = testarQuery('RANK_CANCELAMENTOS', { tipo:'RANK_CANCELAMENTOS' }, [
  ['retorna HTML',           (t) => t.length > 10],
  ['menciona cancelamento',  (t) => /cancel/i.test(t)],
  ['tem nome de motorista',  (t) => Object.keys(motoristas).some(n => t.includes(n.split(' ')[0]))],
]);

// RANK_CANCELAMENTOS com ordem ASC (quem menos cancelou)
const rCanAsc = testarQuery('RANK_CANCELAMENTOS asc (quem menos)', { tipo:'RANK_CANCELAMENTOS', ordem:'asc' }, [
  ['retorna HTML',    (t) => t.length > 10],
  ['menciona menor',  (t) => /menos|menor/i.test(t)],
]);

// TAXA_CANCELAMENTO
testarQuery('TAXA_CANCELAMENTO', { tipo:'TAXA_CANCELAMENTO' }, [
  ['retorna HTML',        (t) => t.length > 10],
  ['tem percentual',      (t) => /%/.test(t)],
]);

// PICO_HORARIO
const rPico = testarQuery('PICO_HORARIO', { tipo:'PICO_HORARIO' }, [
  ['retorna HTML',     (t) => t.length > 10],
  ['tem hora (Nh)',    (t) => /\d+h/.test(t)],
  ['tem % do total',   (t) => /%/.test(t)],
]);

// PERIODO_DIA manhã
testarQuery('PERIODO_DIA manhã', { tipo:'PERIODO_DIA', horas:[6,7,8,9,10,11], label:'manhã (6h–11h)' }, [
  ['retorna HTML',   (t) => t.length > 10],
  ['menciona manhã', (t) => /manh/i.test(t)],
  ['tem finalizadas',(t) => /finaliz/i.test(t)],
]);

// MADRUGADA
testarQuery('MADRUGADA', { tipo:'MADRUGADA' }, [
  ['retorna HTML',     (t) => t.length > 10],
  ['menciona madrugada',(t) => /madrugada/i.test(t)],
]);

// RANK_MACANETA
const rMac = testarQuery('RANK_MACANETA', { tipo:'RANK_MACANETA' }, [
  ['retorna HTML',  (t) => t.length > 10],
  ['trata maçaneta',(t) => /ma[çc]aneta|atendid|atendidas/i.test(t)],
]);
if (totalNA === 0) warn('  Nenhuma "Não Atendida" no CSV — maçaneta retorna aviso esperado');

// TENDENCIA_CORRIDAS
if (datas.length >= 2) {
  testarQuery('TENDENCIA_CORRIDAS', { tipo:'TENDENCIA_CORRIDAS' }, [
    ['retorna HTML',   (t) => t.length > 10],
    ['tem datas',      (t) => /202[0-9]-/.test(t)],
    ['tem variação',   (t) => /[+\-]\d+%/.test(t)],
  ]);
} else probe('Somente 1 dia no CSV — tendência requer 2+ dias, ignorado');

// TENDENCIA_CANCELAMENTOS
testarQuery('TENDENCIA_CANCELAMENTOS', { tipo:'TENDENCIA_CANCELAMENTOS' }, [
  ['retorna HTML',   (t) => t.length > 10],
]);

// COMPARAR_PERIODOS (com dois meses no dataset)
const mesesNoDataset = [...new Set(Object.keys(metricas).map(d=>parseInt(d.split('-')[1])))].sort();
if (mesesNoDataset.length >= 2) {
  const nomeMes1 = MESES_NOME[mesesNoDataset[0]];
  const nomeMes2 = MESES_NOME[mesesNoDataset[mesesNoDataset.length-1]];
  testarQuery(`COMPARAR_PERIODOS (${nomeMes1} vs ${nomeMes2})`,
    { tipo:'COMPARAR_PERIODOS', meses:[nomeMes1, nomeMes2] }, [
    ['retorna HTML',   (t) => t.length > 10],
    ['menciona meses', (t) => t.toLowerCase().includes(nomeMes1)||t.toLowerCase().includes(nomeMes2)],
    ['tem variação',   (t) => /%|pp/.test(t)],
  ]);
} else probe(`Somente 1 mês no CSV (${mesesNoDataset.map(n=>MESES_NOME[n]).join(',')}) — comparação usa fallback`);

// RANK_FINALIZADAS com limite (tabela: 1 header <tr> + até 5 body <tr> = máx 6)
testarQuery('RANK_FINALIZADAS top 5', { tipo:'RANK_FINALIZADAS', limite:5 }, [
  ['retorna HTML',       (t) => t.length > 10],
  ['máx 5 linhas dados', (t,h) => (h.match(/<tr>/g)||[]).length <= 6],
]);

// HORA_ESPECIFICA
testarQuery('HORA_ESPECIFICA 22h', { tipo:'HORA_ESPECIFICA', hora:22 }, [
  ['retorna HTML',   (t) => t.length > 10],
  ['menciona 22h',   (t) => /22h/.test(t)],
]);

// TEMPO_ESPERA
testarQuery('TEMPO_ESPERA', { tipo:'TEMPO_ESPERA' }, [
  ['retorna HTML',  (t) => t.length > 10],
]);

// RESUMO_GERAL
testarQuery('RESUMO_GERAL', { tipo:'RESUMO_GERAL' }, [
  ['retorna HTML',   (t) => t.length > 10],
  ['menciona total', (t) => /solicitações|corridas/i.test(t)],
]);

// ── 8. Testes de filtros (aplicarFiltros via Fase 4) ─────────────────────────
head('Filtros — aplicarFiltros (Fase 4)');

// Testa via qePerguntar (Fase 4 já sobrescreveu window.qePerguntar)
// lastInput e document.getElementById('qe-input') já estão mockados no topo

function simularPergunta(texto) {
  lastInput = texto;
  respostas.length = 0;
  try { window.qePerguntar(); } catch(e) { /* ignora erros de DOM extras */ }
  return respostas[0] || '';
}

// Testa pergunta simples
const r1 = simularPergunta('Quem mais cancelou?');
assert(r1.length > 10, 'qePerguntar: "Quem mais cancelou?" retorna resposta');
assert(/cancel/i.test(stripHtml(r1)), 'Resposta menciona cancelamento');

// Verifica contexto foi salvo
assert(window._qeCtx && window._qeCtx.ultimaIntent &&
  window._qeCtx.ultimaIntent.tipo === 'RANK_CANCELAMENTOS',
  'Contexto: ultimaIntent salva como RANK_CANCELAMENTOS');

// Pergunta de continuação com período
const r2 = simularPergunta('E no período da manhã?');
assert(r2.length > 10, 'qePerguntar cont.: "E de manhã?" retorna resposta');
assert(window._qeCtx.ultimaIntent.tipo === 'RANK_CANCELAMENTOS',
  'Contexto: tópico RANK_CANCELAMENTOS preservado após "E de manhã?"');
const filtrosManha = window._qeCtx.filtrosAtivos;
assert(filtrosManha.horas && filtrosManha.horas.includes(6),
  'Filtro horas=[6..11] ativo após "E de manhã?"');

// Adiciona filtro de mês
const mesPrincipal = mesesNoDataset[mesesNoDataset.length-1]; // último mês
const nomeMesPrincipal = MESES_NOME[mesPrincipal];
const r3 = simularPergunta(`E considerando só ${nomeMesPrincipal}?`);
assert(r3.length > 10, `Cont.: "só ${nomeMesPrincipal}?" retorna resposta`);
const filtrosComMes = window._qeCtx.filtrosAtivos;
assert(filtrosComMes.meses && filtrosComMes.meses.includes(mesPrincipal),
  `Filtro meses=[${mesPrincipal}] ativo após "só ${nomeMesPrincipal}?"`);
assert(filtrosComMes.horas && filtrosComMes.horas.includes(6),
  'Filtro de horas mantido após adicionar mês');

// Top 3
const r4 = simularPergunta('Os top 3');
assert(r4.length > 10, 'Cont.: "Os top 3" retorna resposta');
assert(window._qeCtx.ultimaIntent.limite === 3,
  'Limit=3 aplicado pela modificador "Os top 3"');

// Ordem inversa
const r5 = simularPergunta('Quem menos cancelou?');
assert(r5.length > 10, '"Quem menos cancelou?" retorna resposta');
const intentInversa = window._qeCtx.ultimaIntent;
assert(intentInversa.ordem === 'asc',
  'Ordem ASC detectada em "Quem menos cancelou?"');

// Nova pergunta desconectada
const r6 = simularPergunta('Qual foi o pico operacional?');
assert(r6.length > 10, '"Qual foi o pico operacional?" retorna resposta');
assert(/\d+h/.test(stripHtml(r6)), 'Resposta de pico menciona hora');

// Continuação com filtro de noite
const r7 = simularPergunta('E à noite?');
assert(r7.length > 10, 'Cont.: "E à noite?" retorna resposta');
const filtrosNoite = window._qeCtx.filtrosAtivos;
assert(filtrosNoite.horas && filtrosNoite.horas.includes(18),
  'Filtro noite (18h–23h) ativo após "E à noite?"');

// Maçaneta
const r8 = simularPergunta('Quem mais fez maçaneta?');
assert(r8.length > 10, '"Quem mais fez maçaneta?" retorna resposta');
assert(window._qeCtx.ultimaIntent.tipo === 'RANK_MACANETA',
  'Intent RANK_MACANETA detectada');

// Limpar contexto via texto
simularPergunta('limpar');
assert(!window._qeCtx.ultimaIntent && Object.keys(window._qeCtx.filtrosAtivos).length === 0,
  'Contexto limpo após "limpar"');

// ── 9. Testes de borda ────────────────────────────────────────────────────────
head('Testes de Borda e Robustez');

// Pergunta sem dados (antes de carregar)
probe('Comportamento sem dadosImportados');
global.dadosImportados = null;
const rSemDados = simularPergunta('Quem cancelou?');
assert(rSemDados.includes('Sem dados') || rSemDados.includes('CSV'),
  'Resposta adequada quando sem dados carregados');

// Restaura dados
global.dadosImportados = { ...resultado, arquivo:'01a22maio.csv', timestamp:new Date().toISOString() };
window.qeLimparContexto();

// Pergunta de bairro (dado não disponível)
const rBairro = simularPergunta('Qual bairro tem mais corridas?');
assert(rBairro.length > 10 && (rBairro.includes('indispon') || rBairro.includes('bairro') || rBairro.includes('localiz')),
  'Resposta adequada para pergunta de bairro (dados indisponíveis)');

// Hora fora do range (25h)
probe('Intent HORA_ESPECIFICA com hora=25');
const intentHoraInvalida = detectarIntencao('e às 25h?');
// Parser não deve retornar HORA_ESPECIFICA para hora > 23
assert(intentHoraInvalida.tipo !== 'HORA_ESPECIFICA' || intentHoraInvalida.hora <= 23,
  'Hora inválida (25h) não gera HORA_ESPECIFICA');

// Pergunta vazia
probe('Pergunta vazia');
lastInput = '';
let erroVazia = false;
try { window.qePerguntar(); } catch(e) { erroVazia = true; }
assert(!erroVazia, 'Pergunta vazia não gera exceção');

// String de texto puro sem intenção clara → RESUMO_GERAL
const rGeral = simularPergunta('me conta tudo');
assert(rGeral.length > 10, 'Pergunta genérica retorna RESUMO_GERAL com dados');

// Filtro de mês que não existe no dataset → "sem resultados"
const mesInexistente = 'janeiro'; // não tem no CSV de maio
const rMesVazio = simularPergunta(`Filtra só ${mesInexistente}`);
// Pode retornar dados vazios ou fallback
assert(rMesVazio.length > 0, `Filtro por ${mesInexistente} (sem dados) não causa crash`);

// ── 10. Relatório final ───────────────────────────────────────────────────────
const total = passes + fails;
head('RESULTADO');
console.log(`\n  Testes executados: ${total}`);
console.log(`  ${c.g}Passou: ${passes}${c.rst}`);
console.log(`  ${fails>0?c.r:c.g}Falhou: ${fails}${c.rst}`);
console.log(`  Taxa de sucesso: ${Math.round(passes/total*100)}%\n`);

if (fails === 0) {
  console.log(`  ${c.g}✅ PASS — Fases 3 e 4 validadas com dados reais do Rota 77${c.rst}\n`);
} else {
  console.log(`  ${c.r}❌ FAIL — ${fails} teste(s) falharam${c.rst}\n`);
  process.exit(1);
}
