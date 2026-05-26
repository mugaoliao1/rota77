// ── Configurações de planos e adesivo ─────────────────────────
let configPlanos = {};
let configAdesivo = {};

function iniciarEscutaConfig() {
  fbOn(db.ref('rotaads/config/planos'), 'value', s => {
    const defaults = {
      start:     { nome:'Start',     preco:397,  aparicoes:1, vagas:8,  exclusividade:0 },
      movimento: { nome:'Movimento', preco:597,  aparicoes:2, vagas:4,  exclusividade:300 },
      dominante: { nome:'Dominante', preco:1290, aparicoes:4, vagas:2,  exclusividade:500 },
    };
    const saved = s.val() || {};
    configPlanos = {
      start:     { ...defaults.start,     ...(saved.start     || {}) },
      movimento: { ...defaults.movimento, ...(saved.movimento || {}) },
      dominante: { ...defaults.dominante, ...(saved.dominante || {}) },
    };
    Object.keys(configPlanos).forEach(k => { PLANOS[k] = configPlanos[k]; });
    renderConfigPlanos();
  });
  fbOn(db.ref('rotaads/config/adesivo'), 'value', s => {
    configAdesivo = s.val() || { setup: 300, mensal: 150 };
    PRECO_ADESIVO = configAdesivo.mensal || 150;
    const setupEl = document.getElementById('cfg-adesivo-setup');
    const mensalEl = document.getElementById('cfg-adesivo-mensal');
    if(setupEl) setupEl.value = configAdesivo.setup || 300;
    if(mensalEl) mensalEl.value = configAdesivo.mensal || 150;
  });
}

function renderConfigPlanos() {
  const tbody = document.getElementById('cfg-planos-tbody');
  if(!tbody) return;
  tbody.innerHTML = Object.entries(configPlanos).map(([key, p]) => `
    <tr>
      <td><span class="badge badge-${key}">${p.nome}</span></td>
      <td>
        <input type="number" class="form-input" style="width:110px;padding:6px 10px;font-size:13px;"
          value="${p.preco}" min="0" step="10"
          onchange="configPlanos['${key}'].preco=Number(this.value)"/>
      </td>
      <td>
        <input type="number" class="form-input" style="width:80px;padding:6px 10px;font-size:13px;"
          value="${p.aparicoes}" min="1" max="10"
          onchange="configPlanos['${key}'].aparicoes=Number(this.value)"/>
      </td>
      <td>
        <input type="number" class="form-input" style="width:80px;padding:6px 10px;font-size:13px;"
          value="${p.vagas}" min="1" max="30"
          onchange="configPlanos['${key}'].vagas=Number(this.value)"/>
      </td>
      <td>
        <select class="form-select" style="width:100px;padding:6px 10px;font-size:13px;"
          onchange="configPlanos['${key}'].exclusividade = this.value==='sim' ? (configPlanos['${key}'].exclusividade||300) : 0; renderConfigExclus();">
          <option value="nao" ${(!p.exclusividade)?'selected':''}>Não</option>
          <option value="sim" ${(p.exclusividade>0)?'selected':''}>Sim</option>
        </select>
      </td>
      <td>
        <button class="btn btn-primary btn-sm" onclick="salvarPlano('${key}')">💾 Salvar</button>
      </td>
    </tr>
  `).join('');
  renderConfigExclus();
}

function renderConfigExclus() {
  const tbody = document.getElementById('cfg-exclus-tbody');
  if(!tbody) return;
  tbody.innerHTML = Object.entries(configPlanos).map(([key, p]) => {
    const temExcl = p.exclusividade > 0;
    return `
      <tr>
        <td><span class="badge badge-${key}">${p.nome}</span></td>
        <td>
          ${temExcl ? `<input type="number" class="form-input" style="width:110px;padding:6px 10px;font-size:13px;"
            value="${p.exclusividade}" min="0" step="50"
            onchange="configPlanos['${key}'].exclusividade=Number(this.value); this.closest('tr').querySelector('.excl-total').textContent='R$'+(${p.preco||0}+Number(this.value)).toLocaleString('pt-BR')+'/mês'"/>` : '<span style="color:var(--cinza4);">—</span>'}
        </td>
        <td class="excl-total" style="font-weight:600;color:${temExcl?'var(--vm-light)':'var(--cinza4)'};">
          ${temExcl ? 'R$'+(Number(p.preco||0)+Number(p.exclusividade||0)).toLocaleString('pt-BR')+'/mês' : 'Não disponível'}
        </td>
        <td>
          ${temExcl ? `<button class="btn btn-primary btn-sm" onclick="salvarPlano('${key}')">💾 Salvar</button>` : ''}
        </td>
      </tr>
    `;
  }).join('');
}

async function salvarPlano(key) {
  const p = configPlanos[key];
  await db.ref(`rotaads/config/planos/${key}`).set(p);
  PLANOS[key] = p;
  mostrarToast(`✅ Plano ${p.nome} salvo!`, 'sucesso');
}

async function salvarConfigAdesivo() {
  const setup = Number(document.getElementById('cfg-adesivo-setup').value) || 300;
  const mensal = Number(document.getElementById('cfg-adesivo-mensal').value) || 150;
  await db.ref('rotaads/config/adesivo').set({ setup, mensal });
  PRECO_ADESIVO = mensal;
  mostrarToast('✅ Add-on adesivo salvo!', 'sucesso');
}
