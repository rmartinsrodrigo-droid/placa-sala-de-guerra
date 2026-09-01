import { NextResponse } from 'next/server';
import { z } from 'zod';
import { gerarPlaca } from '@/lib/pdf';
import { montarEmailDoPedido } from '@/lib/email-do-pedido';
import { adicionar } from '@/lib/store';

export const runtime = 'nodejs';
export const maxDuration = 30;

const Schema = z.object({
  solicitante: z.string().min(2).max(120),
  emailSolicitante: z.string().email().max(200),
  numeroProjeto: z.string().min(1).max(120),
  clienteEmpresa: z.string().min(1).max(120),
  siteCliente: z.string().max(200).optional().or(z.literal('')),
});

const MIMES_ACEITOS = new Set(['image/png', 'image/jpeg', 'application/pdf']);
const TAMANHO_MAX = 10 * 1024 * 1024;

// Override opcional via env: DESTINATARIOS="a@x.com,b@x.com,c@x.com"
const DESTINATARIOS = process.env.DESTINATARIOS?.split(',').map((s) => s.trim()).filter(Boolean);
const COPIA_FIXA_EMAIL = process.env.COPIA_FIXA_EMAIL;

export async function POST(req: Request) {
  const form = await req.formData();
  const parsed = Schema.safeParse({
    solicitante: form.get('solicitante'),
    emailSolicitante: form.get('emailSolicitante'),
    numeroProjeto: form.get('numeroProjeto'),
    clienteEmpresa: form.get('clienteEmpresa'),
    siteCliente: form.get('siteCliente') ?? '',
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos.', detalhes: parsed.error.flatten() }, { status: 400 });
  }

  const logo = form.get('logo');
  if (!(logo instanceof File)) return NextResponse.json({ error: 'Logo é obrigatório.' }, { status: 400 });
  if (!MIMES_ACEITOS.has(logo.type)) return NextResponse.json({ error: `Formato do logo não suportado (${logo.type}). Use PNG, JPG ou PDF.` }, { status: 400 });
  if (logo.size > TAMANHO_MAX) return NextResponse.json({ error: 'Logo maior que 10 MB.' }, { status: 400 });

  const logoBytes = new Uint8Array(await logo.arrayBuffer());

  let pdfBytes: Uint8Array;
  try {
    pdfBytes = await gerarPlaca(logoBytes, logo.type as 'image/png' | 'image/jpeg' | 'application/pdf');
  } catch (e) {
    console.error('Erro gerando PDF:', e);
    return NextResponse.json({ error: 'Falha ao montar a arte da placa.' }, { status: 500 });
  }

  const dados = parsed.data;

  const { emlBytes, emlFilename } = montarEmailDoPedido({
    solicitante: dados.solicitante,
    emailSolicitante: dados.emailSolicitante,
    numeroProjeto: dados.numeroProjeto,
    clienteEmpresa: dados.clienteEmpresa,
    siteCliente: dados.siteCliente || '',
    pdfBytes,
    destinatarios: DESTINATARIOS,
    copiaFixaEmail: COPIA_FIXA_EMAIL,
  });

  let registroId: string | null = null;
  try {
    const reg = await adicionar({
      solicitante: dados.solicitante,
      emailSolicitante: dados.emailSolicitante,
      numeroProjeto: dados.numeroProjeto,
      clienteEmpresa: dados.clienteEmpresa,
      siteCliente: dados.siteCliente || '',
      logoNome: logo.name,
    }, pdfBytes);
    registroId = reg.id;
  } catch (e) {
    console.error('Falha ao persistir solicitação:', e);
  }

  const headers: Record<string, string> = {
    'Content-Type': 'message/rfc822',
    'Content-Disposition': `attachment; filename="${emlFilename}"`,
  };
  if (registroId) headers['X-Solicitacao-Id'] = registroId;

  return new NextResponse(new Uint8Array(emlBytes) as BodyInit, { status: 200, headers });
}
