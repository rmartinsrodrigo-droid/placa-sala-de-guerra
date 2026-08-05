// Persistência das solicitações. Funciona em dois modos:
// 1) Local (dev): filesystem em ./data/ — solicitações no JSON, PDFs em pasta.
// 2) Produção (Vercel): Vercel Blob — um único JSON + um blob por PDF.
// Detecta modo automaticamente pela presença de BLOB_READ_WRITE_TOKEN.

import { head, put } from '@vercel/blob';
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

// Todas as leituras são resilientes: se o storage falhar (ex.: token faltando
// ou disco read-only no Vercel), retornamos vazio e logamos, em vez de crashar.

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

// ---------- Implementação VERCEL BLOB (produção) ----------

async function blobListar(): Promise<Solicitacao[]> {
  try {
    const info = await head(NOME_LISTA);
    const resp = await fetch(info.url, { cache: 'no-store' });
    if (!resp.ok) return [];
    const data = await resp.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return []; // não existe ainda
  }
}

async function blobAdicionar(dados: DadosEntrada, pdfBytes: Uint8Array): Promise<Solicitacao> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const pdfPath = `pdfs/${id}.pdf`;

  await put(pdfPath, Buffer.from(pdfBytes), {
    access: 'public',
    contentType: 'application/pdf',
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  const reg: Solicitacao = { id, criadoEm: new Date().toISOString(), pdfPath, ...dados };
  const atual = await blobListar();
  atual.unshift(reg);

  await put(NOME_LISTA, JSON.stringify(atual, null, 2), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
  });

  return reg;
}

async function blobPdfDe(id: string): Promise<Uint8Array | null> {
  try {
    const info = await head(`pdfs/${id}.pdf`);
    const resp = await fetch(info.url, { cache: 'no-store' });
    if (!resp.ok) return null;
    return new Uint8Array(await resp.arrayBuffer());
  } catch {
    return null;
  }
}
