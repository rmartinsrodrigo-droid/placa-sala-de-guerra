// Compõe o email .eml da solicitação a partir dos dados do pedido +
// o PDF já gerado. Usado tanto no envio inicial (/api/solicitar) quanto
// na re-obtenção do email pelo histórico (/adm/[id]/eml).

import { montarEml } from './eml';

// Destinatários primários (TO). Editar aqui se mudarem os responsáveis.
const DESTINATARIOS_DEFAULT = [
  'RecepcaoSP@awnet.com.br',
  'Shara.Portes@awnet.com.br',
  'Bruno.Mamere@awnet.com.br',
];
const COPIA_FIXA_EMAIL_DEFAULT = 'rodrigo.martins@awnet.com.br';

// Contato de acompanhamento (mencionado no corpo).
const CONTATO_ACOMPANHAMENTO = 'PlotagemSP.AW@awnet.com.br';
const CONTATO_ACOMPANHAMENTO_2 = 'Shara.Portes@awnet.com.br';

export type EmailPedidoInputs = {
  solicitante: string;
  emailSolicitante: string;
  numeroProjeto: string;
  clienteEmpresa: string;
  siteCliente: string;
  pdfBytes: Uint8Array;
  destinatarios?: string[];
  copiaFixaEmail?: string;
};

export function montarEmailDoPedido(i: EmailPedidoInputs) {
  const destinatarios = i.destinatarios && i.destinatarios.length ? i.destinatarios : DESTINATARIOS_DEFAULT;
  const copiaFixaEmail = i.copiaFixaEmail || COPIA_FIXA_EMAIL_DEFAULT;

  const pdfFilename = `placa-sala-guerra-${slug(i.clienteEmpresa)}-${slug(i.numeroProjeto)}.pdf`;

  const bodyText = [
    `Olá, equipe de Plotagem!`,
    ``,
    `Segue anexo o arquivo da placa da Sala de Guerra do projeto ${i.numeroProjeto} - ${i.clienteEmpresa}, já com o logo do cliente aplicado.`,
    ``,
    `Instruções de produção:`,
    `Modelo: Placa de Sala de Guerra (padrão AW)`,
    `Formato do arquivo: A3 paisagem`,
    `Impressão no material padrão desse tipo de placa`,
    ``,
    `Solicitante: ${i.solicitante}`,
    `Nº / Nome do Projeto: ${i.numeroProjeto}`,
    `Cliente: ${i.clienteEmpresa}`,
    ``,
    `SLA de produção: 3 dias úteis.`,
    `Retirada: Bruno.Mamere / Recepção irá retirar e combinar com o Solicitante: ${i.solicitante} o local para colar a placa.`,
    `Para acompanhamento, contato: ${CONTATO_ACOMPANHAMENTO} e ${CONTATO_ACOMPANHAMENTO_2}`,
    ``,
    `Obrigado!`,
  ].join('\n');

  const bodyHtml = `
    <div style="font-family: Arial, sans-serif; color:#000; font-size: 14px; line-height: 1.55;">
      <p>Olá, equipe de Plotagem!</p>
      <p>Segue anexo o arquivo da placa da <strong>Sala de Guerra</strong> do projeto
        <strong>${escapeHtml(i.numeroProjeto)} - ${escapeHtml(i.clienteEmpresa)}</strong>,
        já com o logo do cliente aplicado.</p>

      <p><strong>Instruções de produção:</strong></p>
      <ul style="margin: 0 0 12px 0; padding-left: 20px;">
        <li>Modelo: <strong>Placa de Sala de Guerra</strong> (padrão AW)</li>
        <li>Formato do arquivo: A3 paisagem</li>
        <li>Impressão no material padrão desse tipo de placa</li>
      </ul>

      <p style="margin: 12px 0;">
        <strong>Solicitante:</strong> ${escapeHtml(i.solicitante)}<br/>
        <strong>Nº / Nome do Projeto:</strong> ${escapeHtml(i.numeroProjeto)}<br/>
        <strong>Cliente:</strong> ${escapeHtml(i.clienteEmpresa)}
      </p>

      <div style="background:#D7F0EE; padding:12px 14px; border-left:3px solid #79CBC6; margin: 16px 0;">
        <p style="margin: 0 0 8px 0;"><strong>SLA de produção:</strong> 3 dias úteis.</p>
        <p style="margin: 0 0 8px 0;">
          <strong>Retirada:</strong> Bruno.Mamere / Recepção irá retirar e combinar com o
          <strong>Solicitante: ${escapeHtml(i.solicitante)}</strong> o local para colar a placa.
        </p>
        <p style="margin: 0;">
          Para acompanhamento, contato:
          <a href="mailto:${escapeHtml(CONTATO_ACOMPANHAMENTO)}">${escapeHtml(CONTATO_ACOMPANHAMENTO)}</a>
          e
          <a href="mailto:${escapeHtml(CONTATO_ACOMPANHAMENTO_2)}">${escapeHtml(CONTATO_ACOMPANHAMENTO_2)}</a>.
        </p>
      </div>

      <p>Obrigado!</p>
    </div>
  `.trim();

  const ccSet = new Set<string>();
  const normalize = (e: string) => e.trim().toLowerCase();
  const toNormalizedSet = new Set(destinatarios.map(normalize));
  for (const cand of [i.emailSolicitante, copiaFixaEmail]) {
    if (cand && !toNormalizedSet.has(normalize(cand))) ccSet.add(normalize(cand));
  }

  const emlBytes = montarEml({
    to: destinatarios,
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
