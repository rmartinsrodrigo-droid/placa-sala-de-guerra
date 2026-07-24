import { NextResponse } from 'next/server';
import { listar } from '@/lib/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const solicitacoes = await listar();
  return NextResponse.json({ solicitacoes });
}
