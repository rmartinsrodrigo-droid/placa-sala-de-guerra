import { NextResponse } from 'next/server';
import { pdfDe } from '@/lib/store';

export const runtime = 'nodejs';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9-]+$/.test(id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }
  const bytes = await pdfDe(id);
  if (!bytes) return NextResponse.json({ error: 'não encontrado' }, { status: 404 });
  return new NextResponse(new Uint8Array(bytes) as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="placa-${id}.pdf"`,
    },
  });
}
