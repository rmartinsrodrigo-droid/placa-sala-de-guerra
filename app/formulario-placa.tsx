'use client';

import { useEffect, useRef, useState } from 'react';
import type { Solicitacao } from '@/lib/store';

type Estado = 'form' | 'gerando' | 'preview' | 'enviando' | 'enviado';

const EMAIL_PLOTTER = 'PlotagemSP.AW@awnet.com.br';

export default function FormularioPlaca() {
  const [estado, setEstado] = useState<Estado>('form');
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [historico, setHistorico] = useState<Solicitacao[] | null>(null);
  const [solicitacaoId, setSolicitacaoId] = useState<string | null>(null);

  const formRef = useRef<HTMLFormElement | null>(null);
  const dadosRef = useRef<FormData | null>(null); // preserva os dados entre preview e envio
  const emlBlobRef = useRef<{ url: string; filename: string } | null>(null);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      if (emlBlobRef.current) URL.revokeObjectURL(emlBlobRef.current.url);
    };
  }, [pdfUrl]);

  async function gerarPreview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMensagemErro(null);
    setEstado('gerando');

    const form = new FormData(e.currentTarget);
    dadosRef.current = form;

    const resp = await fetch('/api/preview', { method: 'POST', body: form });
    if (!resp.ok) {
      const j = await resp.json().catch(() => ({}));
      setEstado('form');
      setMensagemErro(j.error || 'Erro ao gerar a placa.');
      return;
    }
    const blob = await resp.blob();
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(URL.createObjectURL(blob));
    setEstado('preview');
  }

  function refazer() {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setEstado('form');
  }

  async function confirmarEnvio() {
    if (!dadosRef.current) return;
    setEstado('enviando');
    setMensagemErro(null);

    const resp = await fetch('/api/solicitar', { method: 'POST', body: dadosRef.current });
    if (!resp.ok) {
      const j = await resp.json().catch(() => ({}));
      setEstado('preview');
      setMensagemErro(j.error || 'Erro ao enviar a solicitação.');
      return;
    }

    const cd = resp.headers.get('Content-Disposition') || '';
    const match = cd.match(/filename="([^"]+)"/);
    const filename = match?.[1] || 'placa.eml';
    const id = resp.headers.get('X-Solicitacao-Id');
    setSolicitacaoId(id);

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    if (emlBlobRef.current) URL.revokeObjectURL(emlBlobRef.current.url);
    emlBlobRef.current = { url, filename };

    // Dispara o download do .eml (abre no Outlook se configurado)
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    // Carrega o histórico
    try {
      const h = await fetch('/api/historico').then((r) => r.json());
      setHistorico(h.solicitacoes || []);
    } catch { setHistorico([]); }

    setEstado('enviado');
  }

  function reabrirEmail() {
    if (!emlBlobRef.current) return;
    const a = document.createElement('a');
    a.href = emlBlobRef.current.url;
    a.download = emlBlobRef.current.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function novaSolicitacao() {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    if (emlBlobRef.current) URL.revokeObjectURL(emlBlobRef.current.url);
    setPdfUrl(null);
    setSolicitacaoId(null);
    setHistorico(null);
    dadosRef.current = null;
    emlBlobRef.current = null;
    setMensagemErro(null);
    setEstado('form');
    if (formRef.current) formRef.current.reset();
  }

  return (
    <>
      <header className="bg-black text-white px-8 py-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[color:var(--aw-prata)]">Athié Wohnrath</p>
          <h1 className="text-lg font-bold uppercase tracking-tight">Placa Sala de Guerra</h1>
        </div>
        <a href="/adm" className="text-xs uppercase tracking-widest text-[color:var(--aw-prata)] hover:text-[color:var(--aw-tiffany)]">
          ADM →
        </a>
      </header>

      <div className={`mx-auto px-6 py-10 w-full flex-1 ${estado === 'enviado' ? 'max-w-6xl' : 'max-w-2xl'}`}>
        <TelaForm
          visivel={estado === 'form' || estado === 'gerando'}
          formRef={formRef}
          onSubmit={gerarPreview}
          gerando={estado === 'gerando'}
          erro={mensagemErro}
        />

        {estado === 'preview' && (
          <TelaPreview pdfUrl={pdfUrl} onRefazer={refazer} onConfirmar={confirmarEnvio} />
        )}

        {estado === 'enviando' && (
          <div className="text-center py-16">
            <p className="text-lg font-bold uppercase tracking-wider">Enviando…</p>
          </div>
        )}

        {estado === 'enviado' && (
          <TelaEnviado
            onNova={novaSolicitacao}
            solicitacaoId={solicitacaoId}
            historico={historico}
            onReabrirEmail={emlBlobRef.current ? reabrirEmail : null}
          />
        )}
      </div>
    </>
  );
}

function TelaForm({
  visivel, formRef, onSubmit, gerando, erro,
}: {
  visivel: boolean;
  formRef: React.RefObject<HTMLFormElement | null>;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  gerando: boolean;
  erro: string | null;
}) {
  if (!visivel) return null;
  return (
    <>
      <section className="mb-10">
        <h2 className="text-lg md:text-xl font-bold uppercase tracking-tight mb-4">
          Solicitação de Placa para Sala de Guerra
        </h2>
        <p className="text-sm text-[color:var(--aw-grafite)] mb-4">
          Bem-vindo! Este formulário tem como objetivo centralizar as solicitações de placas para as Salas de Guerra.
          Informe os dados abaixo para que possamos confeccionar a placa corretamente.
        </p>
        <div className="text-sm text-[color:var(--aw-grafite)] bg-[color:var(--aw-tiffany-claro)]/60 border-l-2 border-[color:var(--aw-tiffany-forte)] px-4 py-3 space-y-1">
          <p className="font-bold text-black uppercase tracking-wider text-xs mb-1">Atenção.</p>
          <p><strong className="text-black">SLA de produção da placa:</strong> 3 dias úteis.</p>
          <p><strong className="text-black">Retirada:</strong> na Plotter do 13º andar.</p>
          <p>
            Para acompanhamento, entre em contato com{' '}
            <a href={`mailto:${EMAIL_PLOTTER}`} className="text-black underline decoration-[color:var(--aw-tiffany-forte)] underline-offset-2 font-semibold">
              {EMAIL_PLOTTER}
            </a>.
          </p>
        </div>
      </section>

      <form ref={formRef} onSubmit={onSubmit} className="grid gap-6">
        <Campo n={1} label="Solicitante" name="solicitante" required />
        <Campo n={2} label="Seu email (pra você ficar em cópia)" name="emailSolicitante" type="email" required placeholder="nome@awnet.com.br" />
        <Campo n={3} label="Número / Nome do Projeto" name="numeroProjeto" required />
        <Campo n={4} label="Nome do cliente (empresa)" name="clienteEmpresa" required />
        <Campo n={5} label="Site do cliente" name="siteCliente" type="url" placeholder="https://…" />

        <label className="flex flex-col gap-2">
          <span className="text-sm">
            <span className="text-[color:var(--aw-tiffany-forte)] font-semibold mr-2">6.</span>
            Faça uploading do logo que você quer que esteja na placa. <span className="text-red-600">*</span>
          </span>
          <input
            type="file"
            name="logo"
            accept="image/png,image/jpeg,application/pdf"
            required
            className="border border-[color:var(--aw-prata)] p-3 file:mr-4 file:py-2 file:px-4 file:border-0 file:bg-black file:text-white file:uppercase file:tracking-wider file:text-xs"
          />
          <span className="text-xs text-[color:var(--aw-grafite)]">
            PNG, JPG ou PDF. Se possível, envie a versão vetorial (PDF/SVG exportado como PDF).
          </span>
        </label>

        {erro && <p className="text-sm text-red-700">{erro}</p>}

        <button
          type="submit"
          disabled={gerando}
          className="bg-[color:var(--aw-tiffany)] text-black font-bold px-6 py-4 uppercase tracking-wider hover:bg-[color:var(--aw-tiffany-forte)] disabled:opacity-50"
        >
          {gerando ? 'Gerando…' : 'Gerar Placa'}
        </button>
      </form>
    </>
  );
}

function TelaPreview({
  pdfUrl, onRefazer, onConfirmar,
}: {
  pdfUrl: string | null;
  onRefazer: () => void;
  onConfirmar: () => void;
}) {
  return (
    <section>
      <h2 className="text-xl md:text-2xl font-bold uppercase tracking-tight mb-2">Arte gerada!</h2>
      <p className="text-sm text-[color:var(--aw-grafite)] mb-5">
        Revise se o logo do cliente está aplicado corretamente:
      </p>

      <div className="border border-[color:var(--aw-prata)] bg-white">
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            title="Preview da placa"
            className="w-full h-[70vh]"
          />
        ) : (
          <p className="text-center py-10 text-[color:var(--aw-grafite)]">carregando preview…</p>
        )}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          onClick={onRefazer}
          className="border border-black text-black font-bold px-6 py-3 uppercase tracking-wider hover:bg-black hover:text-white"
        >
          Refazer
        </button>
        <button
          onClick={onConfirmar}
          className="bg-[color:var(--aw-tiffany)] text-black font-bold px-6 py-3 uppercase tracking-wider hover:bg-[color:var(--aw-tiffany-forte)]"
        >
          OK, enviar pra Plotter
        </button>
      </div>
    </section>
  );
}

function TelaEnviado({
  onNova, solicitacaoId, historico, onReabrirEmail,
}: {
  onNova: () => void;
  solicitacaoId: string | null;
  historico: Solicitacao[] | null;
  onReabrirEmail: (() => void) | null;
}) {
  return (
    <section>
      <div className="max-w-3xl mx-auto">
        <div className="bg-white border border-[color:var(--aw-prata)]/40 shadow-sm p-8 md:p-10">
          <h2 className="font-bold text-xl md:text-2xl uppercase tracking-wider text-black">
            Geramos a arte pra você!
          </h2>

          <p className="text-sm text-[color:var(--aw-grafite)] mt-4 leading-relaxed">
            <strong className="text-black">Leia com atenção:</strong> agora você só precisa abrir
            o e-mail e disparar seu pedido para o time da Plotter. Um rascunho foi baixado
            (arquivo <code className="bg-[color:var(--aw-tiffany-claro)] px-1 py-0.5">.eml</code>).
            Abra o arquivo e clique em <strong className="text-black">Enviar</strong>.
          </p>

          {onReabrirEmail && (
            <button
              onClick={onReabrirEmail}
              className="w-full mt-7 bg-[color:var(--aw-tiffany)] hover:bg-[color:var(--aw-tiffany-forte)] transition-all py-6 px-6 flex items-center justify-between text-black shadow-lg hover:shadow-2xl ring-4 ring-[color:var(--aw-tiffany-claro)] hover:ring-[color:var(--aw-tiffany-medio)] group"
            >
              <span className="text-sm md:text-base pr-4 font-medium text-left">
                Segue o e-mail prontinho pra você enviar com seu pedido.
              </span>
              <span className="font-black uppercase text-base md:text-lg tracking-wider whitespace-nowrap group-hover:translate-x-1 transition-transform">
                Clique aqui ›
              </span>
            </button>
          )}

          {solicitacaoId && (
            <p className="text-sm text-[color:var(--aw-grafite)] mt-8 pt-6 border-t border-[color:var(--aw-prata)]/30 leading-relaxed">
              <strong className="text-black">Ainda assim não deu?</strong> Você pode baixar a arte{' '}
              <a
                href={`/adm/${solicitacaoId}/pdf`}
                className="text-black font-bold underline decoration-[color:var(--aw-tiffany-forte)] decoration-2 underline-offset-2 hover:text-[color:var(--aw-tiffany-forte)]"
              >
                clicando aqui
              </a>{' '}
              e enviar para{' '}
              <a
                href={`mailto:${EMAIL_PLOTTER}`}
                className="text-black font-bold underline decoration-[color:var(--aw-tiffany-forte)] decoration-2 underline-offset-2 hover:text-[color:var(--aw-tiffany-forte)]"
              >
                {EMAIL_PLOTTER}
              </a>.
            </p>
          )}

          <div className="mt-6">
            <button
              onClick={onNova}
              className="text-[color:var(--aw-grafite)] hover:text-black font-semibold uppercase tracking-wider text-xs"
            >
              ← Nova solicitação
            </button>
          </div>
        </div>
      </div>

      <div className="mt-14">
        <h3 className="text-lg font-bold uppercase tracking-tight mb-4">Histórico</h3>
        <TabelaHistorico solicitacoes={historico} />
      </div>
    </section>
  );
}

function TabelaHistorico({ solicitacoes }: { solicitacoes: Solicitacao[] | null }) {
  if (solicitacoes === null) return <p className="text-sm text-[color:var(--aw-grafite)]">carregando…</p>;
  if (solicitacoes.length === 0) return <p className="text-sm text-[color:var(--aw-grafite)]">Nenhuma solicitação ainda.</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-black text-white text-left">
            <Th>Data</Th>
            <Th>Solicitante</Th>
            <Th>E-mail</Th>
            <Th>Projeto</Th>
            <Th>Cliente</Th>
            <Th>Site</Th>
            <Th>E-mail (.eml)</Th>
            <Th>PDF</Th>
          </tr>
        </thead>
        <tbody>
          {solicitacoes.map((s) => (
            <tr key={s.id} className="border-b border-[color:var(--aw-prata)]/50 hover:bg-[color:var(--aw-tiffany-claro)]/40">
              <td className="p-3 whitespace-nowrap text-[color:var(--aw-grafite)]">{formatarData(s.criadoEm)}</td>
              <td className="p-3 font-semibold">{s.solicitante}</td>
              <td className="p-3">
                <a href={`mailto:${s.emailSolicitante}`} className="underline decoration-[color:var(--aw-tiffany-forte)] underline-offset-2">
                  {s.emailSolicitante}
                </a>
              </td>
              <td className="p-3">{s.numeroProjeto}</td>
              <td className="p-3">{s.clienteEmpresa}</td>
              <td className="p-3">
                {s.siteCliente ? (
                  <a href={s.siteCliente} target="_blank" rel="noreferrer" className="underline decoration-[color:var(--aw-tiffany-forte)] underline-offset-2">
                    site
                  </a>
                ) : <span className="text-[color:var(--aw-prata)]">-</span>}
              </td>
              <td className="p-3">
                <a
                  href={`/adm/${s.id}/eml`}
                  className="inline-block bg-black text-white font-semibold uppercase text-xs tracking-wider px-3 py-1.5 hover:bg-[color:var(--aw-grafite)]"
                >
                  Baixar e-mail
                </a>
              </td>
              <td className="p-3">
                <a
                  href={`/adm/${s.id}/pdf`}
                  className="inline-block border border-black text-black font-semibold uppercase text-xs tracking-wider px-3 py-1.5 hover:bg-black hover:text-white"
                >
                  PDF
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="p-3 uppercase tracking-wider text-xs font-semibold">{children}</th>;
}

function Campo({
  n, label, name, type = 'text', required, placeholder,
}: {
  n: number; label: string; name: string; type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-sm">
        <span className="text-[color:var(--aw-tiffany-forte)] font-semibold mr-2">{n}.</span>
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        placeholder={placeholder}
        className="border border-[color:var(--aw-prata)] px-4 py-3 focus:outline-none focus:border-black bg-[color:var(--aw-tiffany-claro)]/30"
      />
    </label>
  );
}

function formatarData(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
