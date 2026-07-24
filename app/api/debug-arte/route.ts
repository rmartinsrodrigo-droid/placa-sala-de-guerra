import { NextResponse } from 'next/server';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gerarPlaca } from '@/lib/pdf';

export const runtime = 'nodejs';

// GET /api/debug-arte
// Gera um PDF de calibração usando o logo AW como "logo do cliente" (placeholder),
// com contornos coloridos das áreas: VERMELHO = máscara do rodapé,
// AZUL = slot do logo AW novo, VERDE = slot do logo do cliente.
// Use pra ver se as coordenadas estão certas antes de gerar placa real.
export async function GET() {
  try {
    // Reusa o próprio logo AW como placeholder de logo do cliente
    let dir = path.dirname(fileURLToPath(import.meta.url));
    let logoPath: string | null = null;
    for (let i = 0; i < 12; i++) {
      const candidate = path.join(dir, 'assets', 'logo-aw.pdf');
      if (existsSync(candidate)) { logoPath = candidate; break; }
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
    if (!logoPath) throw new Error('logo-aw.pdf não encontrado');

    const logoBytes = new Uint8Array(await readFile(logoPath));
    const pdfBytes = await gerarPlaca(logoBytes, 'application/pdf', { debug: true });

    return new NextResponse(new Uint8Array(pdfBytes) as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="debug-placa.pdf"',
      },
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
