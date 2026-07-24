// Teste end-to-end: envia um POST para /api/solicitar e inspeciona o .eml retornado.
import { readFileSync, writeFileSync } from 'node:fs';

const logoBytes = readFileSync(new URL('../assets/template.pdf', import.meta.url));
const logoBlob = new Blob([logoBytes], { type: 'application/pdf' });

const form = new FormData();
form.set('solicitante', 'Rodrigo Martins');
form.set('emailSolicitante', 'rodrigo.martins@awnet.com.br');
form.set('numeroProjeto', 'AW-1234 Torre X');
form.set('clienteEmpresa', 'ACME Ltda');
form.set('siteCliente', 'https://acme.com');
form.set('logo', logoBlob, 'logo-teste.pdf');

const resp = await fetch('http://localhost:3000/api/solicitar', {
  method: 'POST',
  body: form,
});

console.log('status:', resp.status);
console.log('content-type:', resp.headers.get('content-type'));
console.log('content-disposition:', resp.headers.get('content-disposition'));

if (!resp.ok) {
  console.log('ERRO:', await resp.text());
  process.exit(1);
}

const emlBytes = new Uint8Array(await resp.arrayBuffer());
writeFileSync(new URL('../scripts/saida-teste.eml', import.meta.url), emlBytes);
console.log('eml size:', emlBytes.length, 'bytes');

// Mostra os primeiros 30 linhas (cabeçalhos + início do corpo)
const text = new TextDecoder().decode(emlBytes.slice(0, 2000));
console.log('---primeiras linhas---');
console.log(text);
