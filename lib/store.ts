// Persistência das solicitações. Funciona em dois modos:
// 1) Local (dev): filesystem em ./data/ — solicitações no JSON, PDFs em pasta.
// 2) Produção (Vercel): Vercel Blob (store PRIVATE) — um único JSON + um blob por PDF.
// Detecta modo automaticamente pela presença de BLOB_READ_WRITE_TOKEN.

import { get, put } from '@vercel/blob';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type Solicitacao = {
  id: string;
  criadoEm: string;
  solicitante: string;
  emailSolicitante: string;
  numeroProjeto: string;
  clienteEmpresa: string;
  siteCliente: string;
  logoNome: string;
  pdfPath: string;
};

type DadosEntrada = Omit<Solicitacao, 'id' | 'criadoEm' | 'pdfPath'>;

const USA_BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const NOME_LISTA = 'solicitacoes.json';

// ---------- API pública ----------

// Todas as leituras são resilientes: se o storage falhar, retornam vazio
// e logam o erro em vez de propagar 500.

export async function listar(): Promise<Solicitacao[]> {
  try {
    return USA_BLOB ? await blobListar() : await fsListar();
  } catch (e) {
    console.error('[store] listar() falhou:', e);
    return [];
  }
}

export async function adicionar(dados: DadosEntrada, pdfBytes: Uint8Array): Promise<Solicitacao> {
  return USA_BLOB ? blobAdicionar(dados, pdfBytes) : fsAdicionar(dados, pdfBytes);
}

export async function pdfDe(id: string): Promise<Uint8Array | null> {
  try {
    return USA_BLOB ? await blobPdfDe(id) : await fsPdfDe(id);
  } catch (e) {
    console.error('[store] pdfDe() falhou:', e);
    return null;
  }
}

// ---------- Implementação FILESYSTEM (local) ----------

let cachedDataDir: string | null = null;

function dataDir(): string {
  if (cachedDataDir) return cachedDataDir;
  try {
    let dir = path.dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < 12; i++) {
      if (existsSync(path.join(dir, 'package.json'))) {
        cachedDataDir = path.join(dir, 'data');
        return cachedDataDir;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch { /* fallthrough */ }
  const fallback = path.join(process.cwd(), 'data');
  cachedDataDir = fallback;
  return fallback;
}

function fsPaths() {
  return {
    dbPath: path.join(dataDir(), NOME_LISTA),
    pdfsDir: path.join(dataDir(), 'pdfs'),
  };
}

async function fsEnsureDirs() {
  await mkdir(dataDir(), { recursive: true });
  await mkdir(fsPaths().pdfsDir, { recursive: true });
}

async function fsListar(): Promise<Solicitacao[]> {
  await fsEnsureDirs();
  const { dbPath } = fsPaths();
  if (!existsSync(dbPath)) return [];
  try {
    const raw = await readFile(dbPath, 'utf-8');
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch { return []; }
}

async function fsAdicionar(dados: DadosEntrada, pdfBytes: Uint8Array): Promise<Solicitacao> {
  await fsEnsureDirs();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const pdfFile = `${id}.pdf`;
  await writeFile(path.join(fsPaths().pdfsDir, pdfFile), pdfBytes);

  const reg: Solicitacao = { id, criadoEm: new Date().toISOString(), pdfPath: pdfFile, ...dados };
  const atual = await fsListar();
  atual.unshift(reg);
  await writeFile(fsPaths().dbPath, JSON.stringify(atual, null, 2), 'utf-8');
  return reg;
}

async function fsPdfDe(id: string): Promise<Uint8Array | null> {
  await fsEnsureDirs();
  const file = path.join(fsPaths().pdfsDir, `${id}.pdf`);
  if (!existsSync(file)) return null;
  return new Uint8Array(await readFile(file));
}

// ---------- Implementação VERCEL BLOB (produção · store PRIVATE) ----------
//
// Store criado como PRIVATE na Vercel — precisa passar `access: 'private'`
// em put() e usar `get()` (em vez de head+fetch) pra ler o conteúdo, porque
// URLs de blobs privados são assinadas com expiração.

async function blobListar(): Promise<Solicitacao[]> {
  const result = await get(NOME_LISTA, { access: 'private' });
  if (!result || result.statusCode !== 200 || !result.stream) return [];
  const text = await new Response(result.stream).text();
  try {
    const data = JSON.parse(text);
    return Array.isArray(data) ? data : [];
  } catch { return []; }
}

async function blobAdicionar(dados: DadosEntrada, pdfBytes: Uint8Array): Promise<Solicitacao> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const pdfPath = `pdfs/${id}.pdf`;

  await put(pdfPath, Buffer.from(pdfBytes), {
    access: 'private',
    contentType: 'application/pdf',
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  const reg: Solicitacao = { id, criadoEm: new Date().toISOString(), pdfPath, ...dados };
  const atual = await blobListar();
  atual.unshift(reg);

  await put(NOME_LISTA, JSON.stringify(atual, null, 2), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  return reg;
}

async function blobPdfDe(id: string): Promise<Uint8Array | null> {
  const result = await get(`pdfs/${id}.pdf`, { access: 'private' });
  if (!result || result.statusCode !== 200 || !result.stream) return null;
  const buf = await new Response(result.stream).arrayBuffer();
  return new Uint8Array(buf);
}
