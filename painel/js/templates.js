// ── Template builder de anúncio ───────────────────────────────
let nichoAtual = 'academia';
let corAtual = '#D7282B';

const NICHO_DEFAULTS = {
  academia:     { slogan:'Transforme seu corpo', cta:'Aula experimental grátis', detalhe:'Equipamentos modernos · Instrutores certificados', foto:'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1400&q=80', cor:'#D7282B' },
  farmacia:     { slogan:'Ofertas especiais hoje', cta:'Receba ofertas no WhatsApp', detalhe:'Até 40% OFF em medicamentos', foto:'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=1400&q=80', cor:'#00C851' },
  supermercado: { slogan:'Promoção imperdível', cta:'Confira mais ofertas', detalhe:'Produtos frescos com o melhor preço', foto:'https://images.unsplash.com/photo-1542838132-92c53300491e?w=1400&q=80', cor:'#F59E0B' },
  restaurante:  { slogan:'Sabor que conquista', cta:'Peça pelo WhatsApp', detalhe:'Pratos exclusivos todos os dias', foto:'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1400&q=80', cor:'#D4AF37' },
  estetica:     { slogan:'Realce sua beleza', cta:'Agende sua visita', detalhe:'Sobrancelha · Limpeza · Manicure', foto:'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1400&q=80', cor:'#E0A0F0' },
  internet:     { slogan:'Internet que não te deixa na mão', cta:'Assine agora', detalhe:'500 Mega · Fibra óptica · Sem fidelidade', foto:'', cor:'#4080FF' },
  imobiliaria:  { slogan:'Seu lar ideal te espera', cta:'Ver imóveis disponíveis', detalhe:'120+ imóveis · 15 anos de experiência', foto:'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1400&q=80', cor:'#D4AF37' },
};

function selecionarNicho(nicho, btn) {
  nichoAtual = nicho;
  document.querySelectorAll('.tpl-nicho-btn').forEach(b=>b.classList.remove('ativo'));
  btn.classList.add('ativo');
  const d = NICHO_DEFAULTS[nicho];
  document.getElementById('tpl-slogan').value = d.slogan;
  document.getElementById('tpl-cta').value = d.cta;
  document.getElementById('tpl-detalhe').value = d.detalhe;
  document.getElementById('tpl-foto').value = d.foto;
  document.getElementById('tpl-upload-preview').style.display='none';
  document.getElementById('tpl-upload-placeholder').style.display='block';
  document.getElementById('tpl-img-preview').src='';
  document.getElementById('tpl-upload-file').value='';
  selecionarCorSilencioso(d.cor);
  corAtual = d.cor;
  atualizarTemplate();
}

function selecionarCor(cor, el) {
  corAtual = cor;
  document.querySelectorAll('.tpl-cor').forEach(c=>c.classList.remove('ativo'));
  if (el) el.classList.add('ativo');
  document.getElementById('tpl-cor-custom').value = cor;
  atualizarTemplate();
}

function selecionarCorSilencioso(cor) {
  corAtual = cor;
  document.querySelectorAll('.tpl-cor').forEach(c=>{
    c.classList.remove('ativo');
    if (c.style.background === cor || c.style.backgroundColor === cor) c.classList.add('ativo');
  });
  document.getElementById('tpl-cor-custom').value = cor;
}

function atualizarTemplate() {
  const nome = document.getElementById('tpl-nome').value || 'Nome do Negócio';
  const slogan = document.getElementById('tpl-slogan').value || 'Slogan aqui';
  const cta = document.getElementById('tpl-cta').value || 'Saiba mais';
  const detalhe = document.getElementById('tpl-detalhe').value || '';
  const foto = document.getElementById('tpl-foto').value || '';
  const cor = corAtual;
  const corEscura = cor + '22';

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;800;900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{width:1920px;height:1080px;overflow:hidden;font-family:'Montserrat',sans-serif;background:#0a0a0a;}
.wrap{width:1920px;height:1080px;position:relative;display:flex;align-items:stretch;}
.bg{position:absolute;inset:0;${foto?`background-image:url('${foto}');background-size:cover;background-position:center;opacity:0.5;`:'background:linear-gradient(135deg,#1a1a1a,#0a0a0a);'}}
.overlay{position:absolute;inset:0;background:linear-gradient(to right,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0.6) 55%,rgba(0,0,0,0.15) 100%);}
.vinheta{position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,0.7) 100%);}
.linha{position:absolute;left:0;top:0;bottom:0;width:6px;background:linear-gradient(to bottom,transparent,${cor},transparent);}
.content{position:relative;z-index:5;display:flex;flex-direction:column;justify-content:center;padding:80px 100px;max-width:900px;}
.badge{display:inline-flex;align-items:center;gap:10px;background:${corEscura};border:1px solid ${cor}55;border-radius:30px;padding:10px 22px;margin-bottom:28px;font-size:14px;color:${cor};font-weight:700;text-transform:uppercase;letter-spacing:2px;width:fit-content;}
h1{font-size:90px;font-weight:900;line-height:1.0;margin-bottom:20px;color:white;text-shadow:0 4px 30px rgba(0,0,0,0.5);}
h1 em{color:${cor};font-style:normal;}
.detalhe{background:${corEscura};border-left:4px solid ${cor};padding:16px 22px;border-radius:0 10px 10px 0;margin-bottom:32px;font-size:18px;color:rgba(255,255,255,0.7);}
.cta-btn{display:inline-flex;align-items:center;gap:12px;background:${cor};color:#fff;padding:20px 40px;border-radius:14px;font-size:18px;font-weight:800;text-transform:uppercase;letter-spacing:1px;width:fit-content;}
.barra{position:absolute;bottom:0;left:0;right:0;height:60px;background:rgba(8,8,8,0.97);border-top:2px solid ${cor}66;display:flex;align-items:center;padding:0 60px;justify-content:space-between;}
.barra-logo{font-size:20px;font-weight:900;color:white;} .barra-logo em{color:${cor};font-style:normal;}
.barra-right{font-size:14px;color:rgba(255,255,255,0.4);}
</style></head><body>
<div class="wrap">
  <div class="bg"></div><div class="overlay"></div><div class="vinheta"></div><div class="linha"></div>
  <div class="content">
    <div class="badge">● ${nome}</div>
    <h1>${slogan.includes(' ') ? slogan.split(' ').slice(0,Math.ceil(slogan.split(' ').length/2)).join(' ')+'<br><em>'+slogan.split(' ').slice(Math.ceil(slogan.split(' ').length/2)).join(' ')+'</em>' : '<em>'+slogan+'</em>'}</h1>
    ${detalhe?`<div class="detalhe">${detalhe}</div>`:''}
    <div class="cta-btn">⚡ ${cta}</div>
  </div>
  <div class="barra">
    <div class="barra-logo">MÍDIA<em>CAR</em></div>
    <div class="barra-right">Caçapava do Sul · veiculado por MídiaCar</div>
  </div>
</div></body></html>`;

  const iframe = document.getElementById('tpl-preview-frame');
  if (iframe) {
    const blob = new Blob([html], {type:'text/html'});
    iframe.src = URL.createObjectURL(blob);
  }
}

function usarTemplate() {
  const nome = document.getElementById('tpl-nome').value.trim();
  if (!nome) { mostrarToast('⚠️ Informe o nome do negócio','erro'); return; }

  const nicho = nichoAtual.charAt(0).toUpperCase() + nichoAtual.slice(1);
  const mes = new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'});
  document.getElementById('tpl-anuncio-nome').value = `${nome} — ${nicho} ${mes}`;

  const sel = document.getElementById('tpl-sel-anunciante');
  sel.innerHTML = '<option value="">Selecione o anunciante...</option>';
  Object.entries(anunciantes).forEach(([id,a]) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = a.nome || id;
    sel.appendChild(opt);
  });
  document.getElementById('tpl-sel-campanha').innerHTML = '<option value="">Selecione a campanha...</option>';

  document.getElementById('modal-usar-template').classList.add('show');
}

function tplCarregarCampanhas() {
  const anuncianteId = document.getElementById('tpl-sel-anunciante').value;
  const sel = document.getElementById('tpl-sel-campanha');
  sel.innerHTML = '<option value="">Selecione a campanha...</option>';
  if (!anuncianteId) return;
  Object.entries(campanhas)
    .filter(([,c]) => c && (c.anunciante === anuncianteId || c.anuncianteId === anuncianteId))
    .forEach(([id,c]) => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = `${c.nome} (${c.plano || '—'}) — ${c.status}`;
      sel.appendChild(opt);
    });
}

async function criarAnuncioDoTemplate() {
  const campanhaId = document.getElementById('tpl-sel-campanha').value;
  const nomeAnuncio = document.getElementById('tpl-anuncio-nome').value.trim();
  const duracao = parseInt(document.getElementById('tpl-anuncio-duracao').value) || 10;

  if (!campanhaId) { mostrarToast('⚠️ Selecione a campanha','erro'); return; }
  if (!nomeAnuncio) { mostrarToast('⚠️ Informe o nome do anúncio','erro'); return; }

  const iframe = document.getElementById('tpl-preview-frame');

  const progress = document.getElementById('tpl-criar-progress');
  const status = document.getElementById('tpl-criar-status');
  const bar = document.getElementById('tpl-criar-bar');
  const pct = document.getElementById('tpl-criar-pct');
  const btn = document.getElementById('btn-criar-anuncio-tpl');
  progress.style.display = 'block';
  btn.disabled = true;
  btn.textContent = 'Criando...';

  try {
    const fotoUrl = document.getElementById('tpl-foto').value.trim();

    status.textContent = 'Capturando template...';
    bar.style.width = '20%'; pct.textContent = '20%';

    let urlFinal = fotoUrl;

    bar.style.width = '30%'; pct.textContent = '30%';
    status.textContent = 'Renderizando template...';

    const tplNome    = document.getElementById('tpl-nome').value || 'Nome do Negócio';
    const tplSlogan  = document.getElementById('tpl-slogan').value || 'Slogan';
    const tplCta     = document.getElementById('tpl-cta').value || 'Saiba mais';
    const tplDetalhe = document.getElementById('tpl-detalhe').value || '';
    const tplFoto    = document.getElementById('tpl-foto').value || '';
    const tplCor     = corAtual || '#D7282B';
    const tplCorEsc  = tplCor + '22';
    const sloganPartes = tplSlogan.includes(' ')
      ? tplSlogan.split(' ').slice(0, Math.ceil(tplSlogan.split(' ').length/2)).join(' ')
        + '<br><em>' + tplSlogan.split(' ').slice(Math.ceil(tplSlogan.split(' ').length/2)).join(' ') + '</em>'
      : '<em>' + tplSlogan + '</em>';

    let tplFotoBase64 = '';
    if (tplFoto) {
      try {
        const imgResp = await fetch(tplFoto);
        const imgBlob = await imgResp.blob();
        tplFotoBase64 = await new Promise(res => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.readAsDataURL(imgBlob);
        });
      } catch(e) {
        console.warn('Não foi possível converter imagem para base64:', e);
        tplFotoBase64 = tplFoto;
      }
    }
    const bgStyle = tplFotoBase64
      ? `background-image:url('${tplFotoBase64}');background-size:cover;background-position:center;opacity:0.5;`
      : 'background:linear-gradient(135deg,#1a1a1a,#0a0a0a);';

    const tplWrap = document.createElement('div');
    tplWrap.style.cssText = 'position:fixed;left:-9999px;top:0;width:1920px;height:1080px;overflow:hidden;z-index:-1;font-family:Arial,sans-serif;background:#0a0a0a;';
    tplWrap.innerHTML = `
      <div style="width:1920px;height:1080px;position:relative;display:flex;align-items:stretch;">
        <div style="position:absolute;inset:0;${bgStyle}"></div>
        <div style="position:absolute;inset:0;background:linear-gradient(to right,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0.6) 55%,rgba(0,0,0,0.15) 100%);"></div>
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center,transparent 40%,rgba(0,0,0,0.7) 100%);"></div>
        <div style="position:absolute;left:0;top:0;bottom:0;width:6px;background:linear-gradient(to bottom,transparent,${tplCor},transparent);"></div>
        <div style="position:relative;z-index:5;display:flex;flex-direction:column;justify-content:center;padding:80px 100px;max-width:900px;">
          <div style="display:inline-flex;align-items:center;gap:10px;background:${tplCorEsc};border:1px solid ${tplCor}55;border-radius:30px;padding:10px 22px;margin-bottom:28px;font-size:36px;color:${tplCor};font-weight:700;text-transform:uppercase;letter-spacing:2px;width:fit-content;">● ${tplNome}</div>
          <div style="font-size:90px;font-weight:900;line-height:1.0;margin-bottom:20px;color:white;text-shadow:0 4px 30px rgba(0,0,0,0.5);">${sloganPartes.replace('<em>','<span style="color:'+tplCor+';font-style:normal;">').replace('</em>','</span>')}</div>
          ${tplDetalhe ? `<div style="background:${tplCorEsc};border-left:4px solid ${tplCor};padding:16px 22px;border-radius:0 10px 10px 0;margin-bottom:32px;font-size:36px;color:rgba(255,255,255,0.7);">${tplDetalhe}</div>` : ''}
          <div style="display:inline-flex;align-items:center;gap:12px;background:${tplCor};color:#fff;padding:20px 40px;border-radius:14px;font-size:36px;font-weight:800;text-transform:uppercase;letter-spacing:1px;width:fit-content;">⚡ ${tplCta}</div>
        </div>
        <div style="position:absolute;bottom:0;left:0;right:0;height:60px;background:rgba(8,8,8,0.97);border-top:2px solid ${tplCor}66;display:flex;align-items:center;padding:0 60px;justify-content:space-between;">
          <div style="font-size:40px;font-weight:900;color:white;">MÍDIA<span style="color:${tplCor};font-style:italic;">CAR</span></div>
          <div style="font-size:28px;color:rgba(255,255,255,0.4);">Caçapava do Sul · veiculado por MídiaCar</div>
        </div>
      </div>`;
    document.body.appendChild(tplWrap);

    await new Promise(res => setTimeout(res, 200));

    bar.style.width = '55%'; pct.textContent = '55%';
    status.textContent = 'Capturando imagem...';

    const canvas = await html2canvas(tplWrap, {
      width: 1920, height: 1080,
      useCORS: true, allowTaint: true,
      backgroundColor: '#0a0a0a',
      scale: 1
    });

    document.body.removeChild(tplWrap);

    bar.style.width = '70%'; pct.textContent = '70%';
    status.textContent = 'Enviando pro Cloudinary...';

    const anuncioIdTemp = db.ref().push().key;
    const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', 0.92));
    const formData = new FormData();
    formData.append('file', blob, `template_${anuncioIdTemp}.jpg`);
    formData.append('upload_preset', CLOUDINARY_PRESET);
    formData.append('folder', 'midiacar/templates');

    const resp = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`, {
      method: 'POST', body: formData
    });
    const data = await resp.json();
    if (!data.secure_url) throw new Error(data.error?.message || 'Erro no upload');
    urlFinal = data.secure_url;
    bar.style.width = '85%'; pct.textContent = '85%';

    const anuncioId = db.ref().push().key;
    await db.ref(`rotaads/anuncios/${anuncioId}`).set({
      nome: nomeAnuncio,
      campanha: campanhaId,
      canal: 'tablet',
      tipo: 'imagem',
      duracao,
      url: urlFinal,
      link: '',
      linkOriginal: '',
      cta: document.getElementById('tpl-cta').value || 'Saiba mais',
      status: 'ativo',
      geradoPorTemplate: true,
      nicho: nichoAtual,
    });

    bar.style.width = '100%'; pct.textContent = '100%';
    status.textContent = '✅ Anúncio criado!';

    setTimeout(() => {
      fecharModal('modal-usar-template');
      btn.disabled = false;
      btn.textContent = '🚀 Criar anúncio';
      progress.style.display = 'none';
      bar.style.width = '0%';
      mostrarToast('✅ Anúncio criado com sucesso!', 'sucesso');

      const campanha = campanhas[campanhaId];
      if (campanha?.anunciante) {
        navegar('anunciantes', document.querySelector('.nav-item[onclick*="anunciantes"]'));
        setTimeout(() => abrirDetalheAnunciante(campanha.anunciante), 400);
      }
    }, 1200);

  } catch(err) {
    if (err.message !== 'sem foto') mostrarToast('❌ Erro ao criar anúncio: ' + err.message, 'erro');
    btn.disabled = false;
    btn.textContent = '🚀 Criar anúncio';
    progress.style.display = 'none';
    bar.style.width = '0%';
  }
}

function tplHandleDrop(e) {
  e.preventDefault();
  const area = document.getElementById('tpl-upload-area');
  area.style.borderColor = 'rgba(215,40,43,0.35)';
  area.style.background = 'rgba(215,40,43,0.03)';
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) tplProcessarArquivo(file);
  else mostrarToast('⚠️ Selecione uma imagem (JPG, PNG, WebP)','erro');
}

function tplHandleFile(input) {
  const file = input.files[0];
  if (file) tplProcessarArquivo(file);
}

function tplProcessarArquivo(file) {
  const reader = new FileReader();
  reader.onload = e => {
    document.getElementById('tpl-img-preview').src = e.target.result;
    document.getElementById('tpl-upload-preview').style.display = 'block';
    document.getElementById('tpl-upload-placeholder').style.display = 'none';
  };
  reader.readAsDataURL(file);
  tplUploadCloudinary(file);
}

async function tplUploadCloudinary(file) {
  document.getElementById('tpl-progress-wrap').style.display = 'block';
  document.getElementById('tpl-upload-status').textContent = 'Enviando foto...';
  document.getElementById('tpl-progress-bar').style.width = '0%';
  document.getElementById('tpl-upload-pct').textContent = '0%';

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_PRESET);
  formData.append('folder', 'midiacar/templates');

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/image/upload`);

    xhr.upload.onprogress = e => {
      if (e.lengthComputable) {
        const pct = Math.round((e.loaded / e.total) * 100);
        document.getElementById('tpl-progress-bar').style.width = pct + '%';
        document.getElementById('tpl-upload-pct').textContent = pct + '%';
      }
    };

    xhr.onload = () => {
      const data = JSON.parse(xhr.responseText);
      if (xhr.status === 200) {
        document.getElementById('tpl-upload-status').textContent = '✅ Foto carregada!';
        document.getElementById('tpl-upload-pct').textContent = '100%';
        document.getElementById('tpl-foto').value = data.secure_url;
        atualizarTemplate();
        resolve(data.secure_url);
        setTimeout(() => { document.getElementById('tpl-progress-wrap').style.display = 'none'; }, 2000);
      } else {
        mostrarToast('❌ Erro no upload da foto', 'erro');
        document.getElementById('tpl-progress-wrap').style.display = 'none';
        reject();
      }
    };

    xhr.onerror = () => {
      mostrarToast('❌ Erro de conexão', 'erro');
      document.getElementById('tpl-progress-wrap').style.display = 'none';
      reject();
    };

    xhr.send(formData);
  });
}

function iniciarTemplates() {
  const d = NICHO_DEFAULTS['academia'];
  document.getElementById('tpl-slogan').value = d.slogan;
  document.getElementById('tpl-cta').value = d.cta;
  document.getElementById('tpl-detalhe').value = d.detalhe;
  document.getElementById('tpl-foto').value = d.foto;
  corAtual = d.cor;
  atualizarTemplate();
}
