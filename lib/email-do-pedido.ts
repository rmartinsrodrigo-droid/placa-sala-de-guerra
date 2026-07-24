// Compõe o email .eml da solicitação a partir dos dados do pedido +
// o PDF já gerado. Usado tanto no envio inicial (/api/solicitar) quanto
// na re-obtenção do email pelo histórico (/adm/[id]/eml).

import { montarEml } from './eml';

const GRAFICA_EMAIL_DEFAULT = 'PlotagemSP.AW@awnet.com.br';
const COPIA_FIXA_EMAIL_DEFAULT = 'rodrigo.martins@awnet.com.br';

export type EmailPedidoInputs = {
  solicitante: string;
  emailSolicitante: string;
  numeroProjeto: string;
  clienteEmpresa: string;
  siteCliente: string;
  pdfBytes: Uint8Array;
  graficaEmail?: string;
  copiaFixaEmail?: string;
};

export function montarEmailDoPedido(i: EmailPedidoInputs) {
  const graficaEmail = i.graficaEmail || GRAFICA_EMAIL_DEFAULT;
  const copiaFixaEmail = i.copiaFixaEmail || COPIA_FIXA_EMAIL_DEFAULT;

  const pdfFilename = `placa-sala-guerra-${slug(i.clienteEmpresa)}-${slug(i.numeroProjeto)}.pdf`;

  const bodyText = [
    `Olá, equipe de Plotagem!`,
    ``,
    `Segue anexo o arquivo da placa da Sala de Guerra do projeto ${i.numeroProjeto} / ${i.clienteEmpresa}, já com o logo do cliente aplicado.`,
    ``,
    `Instruções de produção:`,
    `- Modelo: Placa de Sala de Guerra (padrão AW)`,
    `- Formato do arquivo: A3 paisagem`,
    `- Impressão no material padrão desse tipo de placa`,
    ``,
    `Solicitante: ${i.solicitante} (${i.emailSolicitante})`,
    `Nº / Nome do Projeto: ${i.numeroProjeto}`,
    `Cliente: ${i.clienteEmpresa}${i.siteCliente ? ` / ${i.siteCliente}` : ''}`,
    ``,
    `SLA de produção: 3 dias úteis.`,
    `Retirada na Plotter do 13º andar.`,
    `Para acompanhamento, entre em contato com ${graficaEmail}.`,
    ``,
    `Obrigado!`,
  ].join('\n');

  const bodyHtml = `
    <div style="font-family: Arial, sans-serif; color:#000; font-size: 14px; line-height: 1.55;">
      <p>Olá, equipe de Plotagem!</p>
      <p>Segue anexo o arquivo da placa da <strong>Sala de Guerra</strong> do projeto
        <strong>${escapeHtml(i.numeroProjeto)} / ${escapeHtml(i.clienteEmpresa)}</strong>,
        já com o logo do cliente aplicado.</p>
      <p><strong>Instruções de produção:</strong></p>
      <ul>
        <li>Modelo: <strong>Placa de Sala de Guerra</strong> (padrão AW)</li>
        <li>Formato do arquivo: A3 paisagem</li>
        <li>Impressão no material padrão desse tipo de placa</li>
      </ul>
      <p><strong>Solicitante:</strong> ${escapeHtml(i.solicitante)} (${escapeHtml(i.emailSolicitante)})<br/>
        <strong>Nº / Nome do Projeto:</strong> ${escapeHtml(i.numeroProjeto)}<br/>
        <strong>Cliente:</strong> ${escapeHtml(i.clienteEmpresa)}${i.siteCliente ? ` / ${escapeHtml(i.siteCliente)}` : ''}</p>
      <p style="background:#D7F0EE; padding:10px 14px; border-left:3px solid #79CBC6;">
        <strong>SLA de produção:</strong> 3 dias úteis.<br/>
        <strong>Retirada:</strong> na Plotter do 13º andar.<br/>
        Para acompanhamento, contato: <a href="mailto:${escapeHtml(graficaEmail)}">${escapeHtml(graficaEmail)}</a>.
      </p>
      <p>Obrigado!</p>
    </div>
  `.trim();

  const ccSet = new Set<string>();
  const normalize = (e: string) => e.trim().toLowerCase();
  const toNormalized = normalize(graficaEmail);
  for (const cand of [i.emailSolicitante, copiaFixaEmail]) {
    if (cand && normalize(cand) !== toNormalized) ccSet.add(normalize(cand));
  }

  const emlBytes = montarEml({
    to: graficaEmail,
    cc: [...ccSet],
    subject: `[Placa Sala de Guerra] ${i.clienteEmpresa} / ${i.numeroProjeto}`,
    bodyHtml,
    bodyText,
    anexos: [
      { filename: pdfFilename, contentType: 'application/pdf', bytes: i.pdfBytes },
    ],
  });

  const emlFilename = `placa-${slug(i.clienteEmpresa)}-${slug(i.numeroProjeto)}.eml`;

  return { emlBytes, emlFilename, pdfFilename };
}

function slug(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  } as const)[c]!);
}
