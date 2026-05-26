// ── Upload de mídia (Cloudinary) e modal de anúncio ──────────
let arquivoSelecionado = null;

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('upload-area').style.borderColor='rgba(215,40,43,0.3)';
  const file = e.dataTransfer.files[0];
  if (file) processarArquivo(file);
}

function handleFileSelect(input) {
  const file = input.files[0];
  if (file) processarArquivo(file);
}

function processarArquivo(file) {
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) { mostrarToast('❌ Arquivo muito grande. Máximo 50MB.','erro'); return; }
  const isVideo = file.type.startsWith('video/');
  const isImage = file.type.startsWith('image/');
  if (!isVideo && !isImage) { mostrarToast('❌ Formato não suportado.','erro'); return; }

  arquivoSelecionado = file;
  if (isVideo) document.getElementById('anuncio-tipo').value = 'video';
  else document.getElementById('anuncio-tipo').value = 'imagem';

  const reader = new FileReader();
  reader.onload = e => {
    const preview = document.getElementById('upload-preview');
    const placeholder = document.getElementById('upload-placeholder');
    const imgPrev = document.getElementById('upload-img-preview');
    const vidPrev = document.getElementById('upload-video-preview');
    preview.style.display = 'block';
    placeholder.style.display = 'none';
    if (isVideo) {
      vidPrev.style.display='block'; imgPrev.style.display='none';
      vidPrev.src = e.target.result;
    } else {
      imgPrev.style.display='block'; vidPrev.style.display='none';
      imgPrev.src = e.target.result;
    }
  };
  reader.readAsDataURL(file);
  document.getElementById('anuncio-url').value = '';
}

function atualizarPreviewUrl(url) {
  if (!url) return;
  arquivoSelecionado = null;
  const isVideo = url.match(/\.(mp4|webm|mov)$/i);
  const preview = document.getElementById('upload-preview');
  const placeholder = document.getElementById('upload-placeholder');
  const imgPrev = document.getElementById('upload-img-preview');
  const vidPrev = document.getElementById('upload-video-preview');
  preview.style.display = 'block';
  placeholder.style.display = 'none';
  if (isVideo) {
    vidPrev.style.display='block'; imgPrev.style.display='none';
    vidPrev.src = url;
    document.getElementById('anuncio-tipo').value = 'video';
  } else {
    imgPrev.style.display='block'; vidPrev.style.display='none';
    imgPrev.src = url;
    document.getElementById('anuncio-tipo').value = 'imagem';
  }
}

async function uploadMidia(anuncioId) {
  if (!arquivoSelecionado) return null;

  const isVideo = arquivoSelecionado.type.startsWith('video/');

  document.getElementById('upload-progress-wrap').style.display='block';
  document.getElementById('upload-status').textContent = 'Enviando mídia...';
  document.getElementById('upload-progress-bar').style.width = '10%';
  document.getElementById('upload-pct').textContent = '...';

  try {
    const formData = new FormData();
    formData.append('file', arquivoSelecionado);
    formData.append('upload_preset', CLOUDINARY_PRESET);
    formData.append('public_id', `midiacar_${anuncioId}`);
    formData.append('folder', 'midiacar');

    const tipo = isVideo ? 'video' : 'image';
    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${tipo}/upload`;

    return await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl);

      xhr.upload.onprogress = e => {
        if (e.lengthComputable) {
          const pct = Math.round((e.loaded / e.total) * 100);
          document.getElementById('upload-progress-bar').style.width = pct + '%';
          document.getElementById('upload-pct').textContent = pct + '%';
        }
      };

      xhr.onload = () => {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status === 200) {
          document.getElementById('upload-status').textContent = '✅ Upload concluído!';
          document.getElementById('upload-pct').textContent = '100%';
          document.getElementById('anuncio-url').value = data.secure_url;
          arquivoSelecionado = null;
          resolve(data.secure_url);
        } else {
          mostrarToast('❌ Erro no upload: '+(data.error?.message||'Erro desconhecido'),'erro');
          reject(new Error(data.error?.message));
        }
      };

      xhr.onerror = () => { mostrarToast('❌ Erro de conexão no upload','erro'); reject(new Error('Erro de rede')); };
      xhr.send(formData);
    });

  } catch(err) {
    mostrarToast('❌ Erro no upload: '+err.message,'erro');
    throw err;
  }
}

function limparUpload() {
  arquivoSelecionado = null;
  document.getElementById('upload-preview').style.display='none';
  document.getElementById('upload-placeholder').style.display='block';
  document.getElementById('upload-progress-wrap').style.display='none';
  document.getElementById('upload-progress-bar').style.width='0%';
  document.getElementById('upload-file').value='';
  document.getElementById('upload-img-preview').src='';
  document.getElementById('upload-video-preview').src='';
}

function abrirModalAnuncio(campanhaId, anuncioId) {
  const an = anuncioId&&anuncios[anuncioId];
  limparUpload();
  document.getElementById('anuncio-id').value = anuncioId||'';
  document.getElementById('anuncio-campanha-id').value = campanhaId||'';
  document.getElementById('anuncio-nome').value = an?(an.nome||''):'';
  document.getElementById('anuncio-canal').value = an?(an.canal||'tablet'):'tablet';
  document.getElementById('anuncio-tipo').value = an?(an.tipo||'imagem'):'imagem';
  document.getElementById('anuncio-duracao').value = an?(an.duracao||10):10;
  document.getElementById('anuncio-url').value = an?(an.url||''):'';
  if (an?.url) atualizarPreviewUrl(an.url);
  document.getElementById('anuncio-link').value = an?(an.linkOriginal||an.link||''):'';
  document.getElementById('anuncio-cta').value = an?(an.cta||'Saiba mais'):'Saiba mais';
  const trackerBox = document.getElementById('link-rastreamento-box');
  const trackerVal = document.getElementById('link-rastreamento-val');
  if (anuncioId && an?.linkOriginal) {
    trackerVal.textContent = `rota77.pages.dev/r?c=${anuncioId}`;
    trackerBox.style.display = 'block';
  } else {
    trackerBox.style.display = 'none';
  }
  document.getElementById('anuncio-link').oninput = function() {
    const anuncioId = document.getElementById('anuncio-id').value || '(após salvar)';
    if (this.value.trim()) {
      trackerVal.textContent = `rota77.pages.dev/r?c=${anuncioId}`;
      trackerBox.style.display = 'block';
    } else {
      trackerBox.style.display = 'none';
    }
  };
  document.getElementById('anuncio-status').value = an?(an.status||'ativo'):'ativo';
  document.getElementById('modal-anuncio-titulo').textContent = anuncioId?'Editar Anúncio':'Novo Anúncio';
  document.getElementById('modal-anuncio').classList.add('show');
}
function editarAnuncio(aid, cid){ abrirModalAnuncio(cid, aid); }

async function salvarAnuncio() {
  const id = document.getElementById('anuncio-id').value || db.ref().push().key;

  let urlFinal = document.getElementById('anuncio-url').value.trim();
  if (arquivoSelecionado) {
    try { urlFinal = await uploadMidia(id); }
    catch(e) { return; }
  }
  if (!urlFinal) { mostrarToast('⚠️ Adicione uma mídia ou URL','erro'); return; }

  const linkOriginal = document.getElementById('anuncio-link').value.trim();
  const linkRastreamento = linkOriginal ? `https://rota77.pages.dev/r?c=${id}` : '';
  const d = {
    nome: document.getElementById('anuncio-nome').value.trim(),
    campanha: document.getElementById('anuncio-campanha-id').value,
    canal: document.getElementById('anuncio-canal').value,
    tipo: document.getElementById('anuncio-tipo').value,
    duracao: parseInt(document.getElementById('anuncio-duracao').value)||10,
    url: urlFinal,
    link: linkRastreamento,
    linkOriginal: linkOriginal,
    cta: document.getElementById('anuncio-cta').value,
    status: document.getElementById('anuncio-status').value,
  };
  if(!d.nome){mostrarToast('⚠️ Informe o nome','erro');return;}
  await db.ref(`rotaads/anuncios/${id}`).set(d);
  fecharModal('modal-anuncio');
  limparUpload();
  if (anuncianteAtualId) setTimeout(()=>abrirDetalheAnunciante(anuncianteAtualId), 300);
  mostrarToast('✅ Anúncio salvo!','sucesso');
}
