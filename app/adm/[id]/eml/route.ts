import { NextResponse } from 'next/server';
import { listar, pdfDe } from '@/lib/store';
import { montarEmailDoPedido } from '@/lib/email-do-pedido';

export const runtime = 'nodejs';

const GRAFICA_EMAIL = process.env.GRAFICA_EMAIL;
const COPIA_FIXA_EMAIL = process.env.COPIA_FIXA_EMAIL;

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[A-Za-z0-9-]+$/.test(id)) {
    return NextResponse.json({ error: 'id inválido' }, { status: 400 });
  }

  const solicitacoes = await listar();
  const s = solicitacoes.find((x) => x.id === id);
  if (!s) return NextResponse.json({ error: 'solicitação não encontrada' }, { status: 404 });

  const pdfBytes = await pdfDe(id);
  if (!pdfBytes) return NextResponse.json({ error: 'PDF não encontrado' }, { status: 404 });

  const { emlBytes, emlFilename } = montarEmailDoPedido({
    solicitante: s.solicitante,
    emailSolicitante: s.emailSolicitante,
    numeroProjeto: s.numeroProjeto,
    clienteEmpresa: s.clienteEmpresa,
    siteCliente: s.siteCliente,
    pdfBytes,
    graficaEmail: GRAFICA_EMAIL,
    copiaFixaEmail: COPIA_FIXA_EMAIL,
  });

  return new NextResponse(new Uint8Array(emlBytes) as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': 'message/rfc822',
      'Content-Disposition': `attachment; filename="${emlFilename}"`,
    },
  });
}
