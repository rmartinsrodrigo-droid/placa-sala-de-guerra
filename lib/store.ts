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

function dbPath() {
  return path.join(dataDir(), 'solicitacoes.json');
}

function pdfsDir() {
  return path.join(dataDir(), 'pdfs');
}

async function ensureDirs() {
  await mkdir(dataDir(), { recursive: true });
  await mkdir(pdfsDir(), { recursive: true });
}

export async function listar(): Promise<Solicitacao[]> {
  await ensureDirs();
  if (!existsSync(dbPath())) return [];
  try {
    const raw = await readFile(dbPath(), 'utf-8');
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

export async function adicionar(dados: Omit<Solicitacao, 'id' | 'criadoEm' | 'pdfPath'>, pdfBytes: Uint8Array): Promise<Solicitacao> {
  await ensureDirs();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const pdfFile = `${id}.pdf`;
  await writeFile(path.join(pdfsDir(), pdfFile), pdfBytes);

  const reg: Solicitacao = {
    id,
    criadoEm: new Date().toISOString(),
    pdfPath: pdfFile,
    ...dados,
  };

  const atual = await listar();
  atual.unshift(reg);
  await writeFile(dbPath(), JSON.stringify(atual, null, 2), 'utf-8');
  return reg;
}

export async function pdfDe(id: string): Promise<Uint8Array | null> {
  await ensureDirs();
  const file = path.join(pdfsDir(), `${id}.pdf`);
  if (!existsSync(file)) return null;
  return new Uint8Array(await readFile(file));
}
