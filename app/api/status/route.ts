import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Diagnóstico rápido de storage. NÃO EXPORTE VALORES SENSÍVEIS.
export async function GET() {
  const usaBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const isVercel = Boolean(process.env.VERCEL);
  const nodeEnv = process.env.NODE_ENV;

  let blobTest: { ok: boolean; error?: string; url?: string } = { ok: false };

  if (usaBlob) {
    try {
      const { put, get } = await import('@vercel/blob');
      const testKey = `_diagnostico/ping.txt`;
      await put(testKey, Buffer.from('ping ' + new Date().toISOString()), {
        access: 'private',
        contentType: 'text/plain',
        addRandomSuffix: false,
        allowOverwrite: true,
      });
      const result = await get(testKey, { access: 'private' });
      const content = result?.stream ? await new Response(result.stream).text() : '(vazio)';
      blobTest = { ok: true, url: `read: ${content.slice(0, 40)}…` };
    } catch (e) {
      blobTest = { ok: false, error: e instanceof Error ? `${e.name}: ${e.message}` : String(e) };
    }
  }

  return NextResponse.json({
    env: {
      isVercel,
      nodeEnv,
      hasBlobToken: usaBlob,
      tokenPreview: process.env.BLOB_READ_WRITE_TOKEN
        ? `${process.env.BLOB_READ_WRITE_TOKEN.slice(0, 15)}…${process.env.BLOB_READ_WRITE_TOKEN.slice(-4)}`
        : null,
    },
    blobTest,
    timestamp: new Date().toISOString(),
  });
}
