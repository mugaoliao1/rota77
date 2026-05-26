// ── Clima, notícias e montagem do loop de exibição ───────────

let _climaTimer = null  // único interval do relógio — evita acúmulo

function pararRelogioClima() {
  if (_climaTimer !== null) { clearInterval(_climaTimer); _climaTimer = null }
}

const OPENWEATHER_KEY = '54527142de9c00d18a7edd2ecd101f56';
const LAT = '-30.514845';
const LON = '-53.483238';

async function buscarClima() {
  const cache = localStorage.getItem('rotaads_clima_cache');
  const ts    = localStorage.getItem('rotaads_clima_ts');
  if (cache && ts && (Date.now() - Number(ts)) < 10 * 60 * 1000) return JSON.parse(cache);
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&appid=${OPENWEATHER_KEY}&units=metric&lang=pt_br&cnt=8`,
      { signal: AbortSignal.timeout(6000) }
    );
    const d     = await res.json();
    const temps = d.list.map(item => item.main.temp);
    const clima = {
      temp:      Math.round(d.list[0].main.temp),
      min:       Math.round(Math.min(...temps)),
      max:       Math.round(Math.max(...temps)),
      descricao: d.list[0].weather[0].description,
      icone:     d.list[0].weather[0].icon,
      umidade:   d.list[0].main.humidity
    };
    localStorage.setItem('rotaads_clima_cache', JSON.stringify(clima));
    localStorage.setItem('rotaads_clima_ts',    String(Date.now()));
    return clima;
  } catch(e) { return null; }
}

function mostrarSlotClima(clima) {
  const tela = document.getElementById('tela-clima');
  tela.style.display = 'flex';
  anuncioImg.classList.remove('ativo');
  anuncioVideo.classList.remove('ativo');
  anuncioVideo.pause();
  anuncioVideo.removeAttribute('src');
  anuncioVideo.load();

  const iconeUrl = clima?.icone ? `https://openweathermap.org/img/wn/${clima.icone}@2x.png` : '';
  const agora    = new Date();
  const diasSemana = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  const meses      = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const diaSemana  = diasSemana[agora.getDay()];
  const dia        = agora.getDate();
  const mes        = meses[agora.getMonth()];
  const ano        = agora.getFullYear();
  const hora       = String(agora.getHours()).padStart(2,'0');
  const min        = String(agora.getMinutes()).padStart(2,'0');

  tela.innerHTML = `
    <div style="width:100%;height:100%;display:flex;flex-direction:row;align-items:stretch;">
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;border-right:1px solid rgba(215,40,43,0.15);">
        <div style="font-size:12px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:2px;margin-bottom:12px;">Previsão do Tempo</div>
        ${iconeUrl ? `<img src="${iconeUrl}" width="80" style="margin-bottom:4px;" />` : '<div style="font-size:60px;">🌤️</div>'}
        <div style="font-size:96px;font-weight:900;color:#D7282B;line-height:1;">${clima?.temp ?? '--'}°</div>
        <div style="font-size:18px;color:rgba(255,255,255,0.6);margin:8px 0;text-transform:capitalize;">${clima?.descricao ?? ''}</div>
        <div style="font-size:12px;color:rgba(255,255,255,0.25);">Mín ${clima?.min ?? '--'}° · Máx ${clima?.max ?? '--'}° · Umidade ${clima?.umidade ?? '--'}%</div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px 20px;">
        <div style="font-size:12px;color:rgba(255,255,255,0.35);text-transform:uppercase;letter-spacing:2px;margin-bottom:20px;">Caçapava do Sul</div>
        <div style="font-size:80px;font-weight:900;color:white;line-height:1;letter-spacing:-2px;" id="relogio-hora">${hora}:${min}</div>
        <div style="font-size:18px;color:rgba(255,255,255,0.5);margin-top:16px;">${diaSemana}</div>
        <div style="font-size:14px;color:rgba(255,255,255,0.25);margin-top:6px;">${dia} de ${mes} de ${ano}</div>
        <div style="margin-top:40px;font-size:10px;color:rgba(255,255,255,0.2);">MídiaCar · Sua marca em movimento</div>
      </div>
    </div>`;

  pararRelogioClima()
  _climaTimer = setInterval(() => {
    const el = document.getElementById('relogio-hora');
    if (!el) { pararRelogioClima(); return; }
    const n = new Date();
    el.textContent = String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0');
  }, 1000);
}

function mostrarSlotNoticia(noticia) {
  const tela = document.getElementById('tela-clima');
  tela.style.display = 'flex';
  anuncioImg.classList.remove('ativo');
  anuncioVideo.classList.remove('ativo');
  anuncioVideo.pause();
  anuncioVideo.removeAttribute('src');
  anuncioVideo.load();
  const temImagem = noticia.imagem && noticia.imagem.length > 10;

  if (temImagem) {
    tela.innerHTML = `
      <div style="width:100%;height:100%;position:relative;overflow:hidden;">
        <div style="position:absolute;inset:0;background-image:url('${noticia.imagem}');background-size:cover;background-position:center;filter:blur(20px) brightness(0.3);transform:scale(1.1);"></div>
        <div style="position:absolute;left:0;top:0;bottom:0;width:55%;background-image:url('${noticia.imagem}');background-size:cover;background-position:center;"></div>
        <div style="position:absolute;left:35%;top:0;bottom:0;width:30%;background:linear-gradient(to right,transparent,rgba(0,0,0,0.95));"></div>
        <div style="position:absolute;right:0;top:0;bottom:0;width:50%;display:flex;flex-direction:column;justify-content:center;padding:48px 40px 48px 20px;">
          <div style="font-size:9px;color:#D7282B;text-transform:uppercase;letter-spacing:3px;font-weight:700;margin-bottom:20px;animation:dadoEntrar 0.4s both;">● NOTÍCIAS</div>
          <div style="font-size:28px;font-weight:800;color:white;line-height:1.3;margin-bottom:16px;animation:dadoEntrar 0.4s 0.1s both;">${noticia.titulo || ''}</div>
          <div style="font-size:14px;color:rgba(255,255,255,0.5);line-height:1.7;animation:dadoEntrar 0.4s 0.2s both;">${noticia.resumo || ''}</div>
          <div style="margin-top:24px;font-size:9px;color:rgba(255,255,255,0.2);text-transform:uppercase;letter-spacing:2px;animation:dadoEntrar 0.4s 0.3s both;">MídiaCar · Caçapava do Sul</div>
        </div>
      </div>`;
  } else {
    tela.innerHTML = `
      <div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden;">
        <div style="position:absolute;width:500px;height:500px;background:radial-gradient(circle,rgba(215,40,43,0.06) 0%,transparent 70%);top:50%;left:50%;transform:translate(-50%,-50%);"></div>
        <div style="max-width:580px;text-align:center;padding:40px;position:relative;z-index:1;">
          <div style="font-size:9px;color:#D7282B;text-transform:uppercase;letter-spacing:3px;font-weight:700;margin-bottom:24px;animation:dadoEntrar 0.4s both;">● NOTÍCIAS</div>
          <div style="font-size:32px;font-weight:800;color:white;line-height:1.35;margin-bottom:18px;animation:dadoEntrar 0.4s 0.1s both;">${noticia.titulo || ''}</div>
          <div style="width:40px;height:2px;background:#D7282B;margin:0 auto 18px;animation:dadoEntrar 0.4s 0.15s both;"></div>
          <div style="font-size:15px;color:rgba(255,255,255,0.45);line-height:1.7;animation:dadoEntrar 0.4s 0.2s both;">${noticia.resumo || ''}</div>
          <div style="margin-top:32px;font-size:9px;color:rgba(255,255,255,0.15);text-transform:uppercase;letter-spacing:2px;animation:dadoEntrar 0.4s 0.3s both;">MídiaCar · Caçapava do Sul</div>
        </div>
      </div>`;
  }
}

// Notícias via Cloudflare Worker
const WORKER_URL = 'https://rota-news-proxy.mugaoliao.workers.dev/';

async function buscarNoticias() {
  const cache = localStorage.getItem('rotaads_noticias_cache');
  const ts    = localStorage.getItem('rotaads_noticias_ts');
  if (cache && ts && (Date.now() - Number(ts)) < 17 * 60 * 1000) return JSON.parse(cache);
  try {
    const res     = await fetch(WORKER_URL, { signal: AbortSignal.timeout(6000) });
    const noticias = await res.json();
    if (noticias.length) {
      localStorage.setItem('rotaads_noticias_cache', JSON.stringify(noticias));
      localStorage.setItem('rotaads_noticias_ts',    String(Date.now()));
    }
    return noticias;
  } catch(e) { return []; }
}

// Monta o loop: A A N A A C A A N A R
async function inserirSlotClima(lista) {
  const clima      = await buscarClima();
  const noticiasApi = await buscarNoticias();
  const anuncios7  = [];
  for (let i = 0; i < 7; i++) anuncios7.push({ ...lista[i % lista.length], duracao: 10 });
  const slotRota = {
    _noticia:    true,
    noticiaData: { titulo:'MídiaCar — Mobilidade Urbana', resumo:'Solicite sua corrida pelo aplicativo. Rápido, seguro e sempre disponível em Caçapava do Sul.', tipo:'institucional' },
    duracao:     5
  };
  const n1       = noticiasApi[0] ? { _noticia:true, noticiaData:noticiasApi[0], duracao:5 } : slotRota;
  const n2       = noticiasApi[1] ? { _noticia:true, noticiaData:noticiasApi[1], duracao:5 } : slotRota;
  const slotClima = clima ? { _clima:true, climaDados:clima, duracao:5 } : slotRota;
  return [anuncios7[0], anuncios7[1], n1, anuncios7[2], anuncios7[3], slotClima, anuncios7[4], anuncios7[5], n2, anuncios7[6], slotRota];
}
