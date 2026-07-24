# Placa Sala de Guerra · a|w

App interno da Athié Wohnrath que substitui o Microsoft Forms atual pra solicitar placa de Sala de Guerra.

## Como funciona

1. Solicitante abre a página, preenche 5 campos e faz upload do logo do cliente.
2. Ao clicar em **Gerar arte**, o backend monta o PDF da placa a partir de `assets/template.pdf` sobrepondo o logo nos dois slots `[LOGO CLIENTE]`.
3. O browser baixa um arquivo `.eml` que **abre automaticamente no Outlook** como rascunho pré-preenchido:
   - Destinatário: `PlotagemSP.AW@awnet.com.br`
   - Cópia: solicitante + `rodrigo.martins@awnet.com.br`
   - Assunto: `[Placa Sala de Guerra] {Cliente} — {Projeto}`
   - Corpo: instruções de produção pra plotagem + aviso de retirada em 48h
   - Anexo: o PDF da placa
4. Solicitante confere e clica em **Enviar** no Outlook. O email sai da conta dele mesmo, com o histórico ficando no Enviados dele.

Zero contas externas, zero SMTP, zero banco. 100% local até você hospedar.

## Rodar

```bash
cd C:\dev\placa-sala-de-guerra
npm run dev
```

Abre http://localhost:3000.

## Requisito no cliente do usuário

- Windows com **Outlook Desktop** instalado (aparece o rascunho como janela nova ao dar duplo-clique no `.eml`).
- Se o usuário usar só Outlook Web, o `.eml` baixa mas não abre sozinho — ele precisa importar manualmente (raro no cenário AW). Nesse caso vale considerar outra estratégia (SMTP direto via Graph API).

## Calibrar as coordenadas do logo no template

O template está em `assets/template.pdf`. Os dois slots de `[LOGO CLIENTE]` estão configurados em `lib/config.ts` como bounding boxes:

```ts
export const LOGO_SLOTS = [
  { x: 130, y: 300, width: 400, height: 260 }, // esquerdo
  { x: 725, y: 300, width: 400, height: 260 }, // direito
];
```

Coordenadas em pontos PDF (Y cresce de baixo pra cima; página é 1256.55 × 907.89). O logo é redimensionado pra caber preservando proporção. Depois da primeira impressão real, se o logo estiver deslocado ou muito pequeno/grande, ajuste esses 4 números por slot.

## Estrutura

```
app/
├── page.tsx                → renderiza o formulário
├── formulario-placa.tsx    → formulário (client component)
├── globals.css             → tokens AW2026
└── api/solicitar/route.ts  → gera PDF + monta .eml pra download

lib/
├── config.ts               → coordenadas dos slots de logo
├── pdf.ts                  → sobreposição do logo no template
└── eml.ts                  → construtor de arquivo .eml (MIME multipart)

assets/
└── template.pdf            → arte base (A3 paisagem, 2 painéis A4)

scripts/
└── inspect-pdf.mjs         → utilitário pra medir o PDF (node scripts/inspect-pdf.mjs)
```

## Stack

- Next.js 16 (App Router, Turbopack)
- pdf-lib pra sobreposição no template
- zod pra validação
- Sem banco, sem auth, sem storage, sem email server-side
