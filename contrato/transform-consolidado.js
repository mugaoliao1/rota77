// ── Transform puro: resultado do parsearCSV → payload do contrato ────
//
// Contrato de dados consolidados — Fase 1 (ver CONTRATO-DADOS-FASE1.md).
// Destino de escrita (FUTURO, NÃO aqui): rotaads/consolidado/v1/dias/{YYYY-MM-DD}
//
// PURO: não escreve no Firebase, não usa DOM, não tem efeitos colaterais.
// Recebe o retorno do parsearCSV (painel/js/csv.js) e devolve, por data,
// um objeto idempotente pronto para set().
//
// Funciona como script clássico (expõe global) E como módulo Node (require),
// para permitir teste sem navegador. Não é carregado por nenhum HTML nem
// copiado pelo build (vive fora de shared/tablet/portal/painel/anunciante).

(function (root) {
  'use strict';

  var SCHEMA_VERSION = 'v1';
  var PATH_BASE = 'rotaads/consolidado/' + SCHEMA_VERSION + '/dias';

  // Sentinela de timestamp do RTDB — resolvida pelo servidor no momento do
  // set(). Equivale a firebase.database.ServerValue.TIMESTAMP, mas sem
  // depender do SDK (mantém o transform puro).
  var SERVER_TIMESTAMP = { '.sv': 'timestamp' };

  // Chave de motorista OPACA — só armazenamento. Idêntica à sanitização do
  // csv.js legado (salvarMetricas), para consistência de storage. O join do
  // consumidor NÃO usa esta chave; usa o campo `nome` (§6 do contrato).
  function chaveMotoristaOpaca(nome) {
    return String(nome || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 40);
  }

  // Caminho de destino de um dia (para a FUTURA etapa de escrita).
  function caminhoConsolidado(data) {
    return PATH_BASE + '/' + data;
  }

  // Monta o payload de UM dia. Objeto completo → idempotente por set():
  // reprocessar substitui a subárvore inteira (sem chaves órfãs).
  //
  // Trata dois casos detectados na revisão:
  //  A) Colisão de chave opaca (nomes distintos → mesma chave): MESCLA
  //     corridas/km na chave, preserva o PRIMEIRO nome como principal,
  //     registra os demais em `aliases`, adiciona warning em _meta.warnings
  //     e rebaixa _meta.status de "ok" para "parcial".
  //  B) Corridas finalizadas SEM motorista atribuído (resumo > soma dos
  //     motoristas): NÃO altera o resumo, NÃO inventa motorista; apenas
  //     adiciona warning em _meta.warnings. Status permanece.
  function montarDia(metricasDia, motoristasDia, meta) {
    var resumo = {
      corridas: (metricasDia && metricasDia.corridas) || 0,  // SOMENTE finalizadas
      km: (metricasDia && metricasDia.km) || 0,
      tempo_min: (metricasDia && metricasDia.tempo_min) || 0
    };

    var motoristas = {};
    var warnings = [];
    var dict = motoristasDia || {};
    var somaCorridas = 0;

    Object.keys(dict).forEach(function (nome) {
      var chave = chaveMotoristaOpaca(nome);
      if (!chave) return;                 // nome vazio → sem entrada (fica no resumo)
      var m = dict[nome] || {};
      var corridas = m.corridas || 0;
      var km = m.km || 0;
      somaCorridas += corridas;

      if (!motoristas[chave]) {
        motoristas[chave] = { nome: nome, corridas: corridas, km: km };
        return;
      }

      // (A) COLISÃO — mesclar sem sobrescrever; preservar 1º nome; alias.
      var alvo = motoristas[chave];
      alvo.corridas += corridas;
      alvo.km = Math.round((alvo.km + km) * 10) / 10;
      if (!alvo.aliases) alvo.aliases = [];
      if (nome !== alvo.nome && alvo.aliases.indexOf(nome) === -1) alvo.aliases.push(nome);

      var w = null, i;
      for (i = 0; i < warnings.length; i++) {
        if (warnings[i].tipo === 'colisao_chave' && warnings[i].chave === chave) { w = warnings[i]; break; }
      }
      if (!w) warnings.push({ tipo: 'colisao_chave', chave: chave, nomePrincipal: alvo.nome, aliases: alvo.aliases.slice() });
      else w.aliases = alvo.aliases.slice();
    });

    // (B) Discrepância: corridas finalizadas sem motorista atribuído.
    var semMotorista = resumo.corridas - somaCorridas;
    if (semMotorista > 0) {
      warnings.push({
        tipo: 'corridas_sem_motorista',
        corridasResumo: resumo.corridas,
        corridasAtribuidas: somaCorridas,
        corridasSemMotorista: semMotorista
      });
    }

    // Aplicar warnings/status ao _meta do dia.
    var houveColisao = false;
    for (var j = 0; j < warnings.length; j++) { if (warnings[j].tipo === 'colisao_chave') { houveColisao = true; break; } }
    if (warnings.length) meta.warnings = (meta.warnings || []).concat(warnings);
    if (houveColisao && meta.status === 'ok') meta.status = 'parcial';

    return { _meta: meta, resumo: resumo, motoristas: motoristas };
  }

  // Entrada: resultado do parsearCSV → { metricas, metricasPorMotorista, ... }
  // opcoes:
  //   origemArquivo      (obrigatório no uso real)
  //   processadoEm       (default: SERVER_TIMESTAMP; fixar em número p/ teste)
  //   status             (default: 'ok')
  //   geradoPor          (recomendado)
  //   linhasProcessadas  (recomendado)
  //   origemHash         (recomendado)
  // Saída: { [YYYY-MM-DD]: payloadDoDia } — um objeto idempotente por data.
  function montarPayloadConsolidado(resultado, opcoes) {
    resultado = resultado || {};
    opcoes = opcoes || {};
    var metricas = resultado.metricas || {};
    var porMotorista = resultado.metricasPorMotorista || {};

    // _meta base — obrigatórios primeiro
    var metaBase = {
      schemaVersion: SCHEMA_VERSION,
      processadoEm: (opcoes.processadoEm !== undefined) ? opcoes.processadoEm : SERVER_TIMESTAMP,
      origemArquivo: opcoes.origemArquivo || '',
      status: opcoes.status || 'ok'
    };
    // recomendados — só entram se fornecidos
    if (opcoes.geradoPor !== undefined) metaBase.geradoPor = opcoes.geradoPor;
    if (opcoes.linhasProcessadas !== undefined) metaBase.linhasProcessadas = opcoes.linhasProcessadas;
    if (opcoes.origemHash !== undefined) metaBase.origemHash = opcoes.origemHash;

    var payload = {};
    Object.keys(metricas).forEach(function (data) {
      // _meta é por-dia — clona para não compartilhar referência entre dias
      var meta = {};
      Object.keys(metaBase).forEach(function (k) { meta[k] = metaBase[k]; });
      payload[data] = montarDia(metricas[data], porMotorista[data], meta);
    });
    return payload;
  }

  var api = {
    montarPayloadConsolidado: montarPayloadConsolidado,
    montarDia: montarDia,
    chaveMotoristaOpaca: chaveMotoristaOpaca,
    caminhoConsolidado: caminhoConsolidado,
    SCHEMA_VERSION: SCHEMA_VERSION,
    PATH_BASE: PATH_BASE,
    SERVER_TIMESTAMP: SERVER_TIMESTAMP
  };

  // Exposição dupla: global (browser/classic) + module (Node/require).
  root.ContratoConsolidado = api;
  root.montarPayloadConsolidado = montarPayloadConsolidado;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;

})(typeof globalThis !== 'undefined' ? globalThis : this);
