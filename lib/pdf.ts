import { PDFDocument, rgb } from 'pdf-lib';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LOGO_CLIENTE_SLOT, type Slot } from './config';

type LogoMime = 'image/png' | 'image/jpeg' | 'application/pdf';

let cachedAssetsDir: string | null = null;

function assetsDir(): string {
  if (cachedAssetsDir) return cachedAssetsDir;
  try {
    let dir = path.dirname(fileURLToPath(import.meta.url));
    for (let i = 0; i < 12; i++) {
      const candidate = path.join(dir, 'assets');
      if (existsSync(path.join(candidate, 'template.pdf'))) {
        cachedAssetsDir = candidate;
        return candidate;
      }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch { /* fallthrough */ }
  const fallback = path.join(process.cwd(), 'assets');
  cachedAssetsDir = fallback;
  return fallback;
}

export async function gerarPlaca(
  logoBytes: Uint8Array,
  mime: LogoMime,
  opts: { debug?: boolean } = {}
): Promise<Uint8Array> {
  const templateBytes = await readFile(path.join(assetsDir(), 'template.pdf'));
  const pdf = await PDFDocument.load(templateBytes);
  const page = pdf.getPages()[0];

  // Desenha o logo do cliente no slot central (preserva proporção)
  const clienteDraw = await embedLogo(pdf, logoBytes, mime);
  const fit = fitInBox(clienteDraw.width, clienteDraw.height, LOGO_CLIENTE_SLOT);
  clienteDraw.draw(page, fit);

  // DEBUG — desenha contorno verde do slot pra calibração visual
  if (opts.debug) {
    page.drawRectangle({
      x: LOGO_CLIENTE_SLOT.x,
      y: LOGO_CLIENTE_SLOT.y,
      width: LOGO_CLIENTE_SLOT.width,
      height: LOGO_CLIENTE_SLOT.height,
      borderColor: rgb(0, 0.7, 0),
      borderWidth: 2,
      opacity: 0,
      borderOpacity: 1,
    });
  }

  return await pdf.save();
}

async function embedLogo(pdf: PDFDocument, bytes: Uint8Array, mime: LogoMime) {
  if (mime === 'image/png') {
    const img = await pdf.embedPng(bytes);
    return { width: img.width, height: img.height, draw: (p: any, o: Slot) => p.drawImage(img, o) };
  }
  if (mime === 'image/jpeg') {
    const img = await pdf.embedJpg(bytes);
    return { width: img.width, height: img.height, draw: (p: any, o: Slot) => p.drawImage(img, o) };
  }
  if (mime === 'application/pdf') {
    const [ep] = await pdf.embedPdf(await PDFDocument.load(bytes));
    return { width: ep.width, height: ep.height, draw: (p: any, o: Slot) => p.drawPage(ep, o) };
  }
  throw new Error(`Formato de logo não suportado: ${mime}`);
}

function fitInBox(imgW: number, imgH: number, box: Slot): Slot {
  const scale = Math.min(box.width / imgW, box.height / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  return {
    x: box.x + (box.width - w) / 2,
    y: box.y + (box.height - h) / 2,
    width: w,
    height: h,
  };
}
