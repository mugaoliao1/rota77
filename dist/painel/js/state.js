// ── Constantes e estado global do painel ─────────────────────
// Autenticação via Firebase Auth — credenciais gerenciadas no Firebase Console

const PLANOS = {
  start:     {nome:'Start',     preco:397,   aparicoes:1, exclusividade:0},
  movimento: {nome:'Movimento', preco:597,   aparicoes:2, exclusividade:300},
  dominante: {nome:'Dominante', preco:1290,  aparicoes:4, exclusividade:500},
};

let PRECO_ADESIVO = 300;

const CLOUDINARY_CLOUD  = 'diyicapks';
const CLOUDINARY_PRESET = 'midiacar';

let anunciantes = {}, campanhas = {}, anuncios = {}, tablets = {}, editoriais = {};
let anuncianteAtualId = null;
let planoAtual = null;
let contadores = {adesivos: 0};
