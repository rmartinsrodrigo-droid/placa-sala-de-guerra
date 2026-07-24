import { NextResponse } from 'next/server';
import { z } from 'zod';
import { gerarPlaca } from '@/lib/pdf';

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

  try {
    const pdfBytes = await gerarPlaca(logoBytes, logo.type as 'image/png' | 'image/jpeg' | 'application/pdf');
    return new NextResponse(new Uint8Array(pdfBytes) as BodyInit, {
      status: 200,
      headers: { 'Content-Type': 'application/pdf' },
    });
  } catch (e) {
    console.error('Erro gerando preview PDF:', e);
    return NextResponse.json({ error: 'Falha ao montar a arte da placa.' }, { status: 500 });
  }
}
