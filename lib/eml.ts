// Monta um arquivo .eml (RFC 5322 + MIME multipart) que abre como rascunho
// editável no Outlook graças ao header X-Unsent: 1. Zero dependência externa.

type Anexo = {
  filename: string;
  contentType: string;
  bytes: Uint8Array;
};

type Args = {
  to: string;
  cc: string[];
  subject: string;
  bodyHtml: string;
  bodyText: string;
  anexos: Anexo[];
};

const CRLF = '\r\n';

export function montarEml(a: Args): Uint8Array {
  const boundary = 'PLACA_' + Math.random().toString(36).slice(2, 12);
  const altBoundary = 'ALT_' + Math.random().toString(36).slice(2, 12);

  const partes: string[] = [];

  // Cabeçalhos principais
  partes.push(`To: ${a.to}`);
  if (a.cc.length) partes.push(`Cc: ${a.cc.join(', ')}`);
  partes.push(`Subject: ${encodeSubject(a.subject)}`);
  partes.push('X-Unsent: 1'); // faz o Outlook abrir como rascunho
  partes.push('MIME-Version: 1.0');
  partes.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
  partes.push('');

  // Parte 1: multipart/alternative com texto e HTML
  partes.push(`--${boundary}`);
  partes.push(`Content-Type: multipart/alternative; boundary="${altBoundary}"`);
  partes.push('');

  partes.push(`--${altBoundary}`);
  partes.push('Content-Type: text/plain; charset="utf-8"');
  partes.push('Content-Transfer-Encoding: quoted-printable');
  partes.push('');
  partes.push(quotedPrintable(a.bodyText));
  partes.push('');

  partes.push(`--${altBoundary}`);
  partes.push('Content-Type: text/html; charset="utf-8"');
  partes.push('Content-Transfer-Encoding: quoted-printable');
  partes.push('');
  partes.push(quotedPrintable(a.bodyHtml));
  partes.push('');

  partes.push(`--${altBoundary}--`);
  partes.push('');

  // Parte 2..N: cada anexo
  for (const anexo of a.anexos) {
    partes.push(`--${boundary}`);
    partes.push(`Content-Type: ${anexo.contentType}; name="${anexo.filename}"`);
    partes.push('Content-Transfer-Encoding: base64');
    partes.push(`Content-Disposition: attachment; filename="${anexo.filename}"`);
    partes.push('');
    partes.push(base64Wrap(anexo.bytes));
    partes.push('');
  }

  partes.push(`--${boundary}--`);
  partes.push('');

  return new TextEncoder().encode(partes.join(CRLF));
}

function encodeSubject(s: string) {
  // Se for tudo ASCII, retorna direto. Senão, codifica RFC 2047 (base64).
  if (/^[\x20-\x7E]*$/.test(s)) return s;
  const b64 = Buffer.from(s, 'utf-8').toString('base64');
  return `=?utf-8?B?${b64}?=`;
}

function quotedPrintable(s: string): string {
  const buf = Buffer.from(s, 'utf-8');
  let out = '';
  let lineLen = 0;
  for (const byte of buf) {
    const needsEncoding =
      byte < 0x20 && byte !== 0x09 ||
      byte === 0x3d || // '='
      byte > 0x7e;
    let token: string;
    if (byte === 0x0a) {
      out += CRLF;
      lineLen = 0;
      continue;
    }
    if (byte === 0x0d) continue;
    token = needsEncoding ? '=' + byte.toString(16).toUpperCase().padStart(2, '0') : String.fromCharCode(byte);
    if (lineLen + token.length > 75) {
      out += '=' + CRLF;
      lineLen = 0;
    }
    out += token;
    lineLen += token.length;
  }
  return out;
}

function base64Wrap(bytes: Uint8Array): string {
  const b64 = Buffer.from(bytes).toString('base64');
  const lines: string[] = [];
  for (let i = 0; i < b64.length; i += 76) {
    lines.push(b64.slice(i, i + 76));
  }
  return lines.join(CRLF);
}
