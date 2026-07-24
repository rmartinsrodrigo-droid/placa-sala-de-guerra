import Link from 'next/link';
import { listar } from '@/lib/store';
import Rodape from '../rodape';

export const dynamic = 'force-dynamic';

export default async function AdmPage() {
  const solicitacoes = await listar();

  return (
    <main className="flex-1 flex flex-col">
      <header className="bg-black text-white px-8 py-5 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-[color:var(--aw-prata)]">Athié Wohnrath · ADM</p>
          <h1 className="text-lg font-bold uppercase tracking-tight">Solicitações de Placa</h1>
        </div>
        <Link href="/" className="text-xs uppercase tracking-widest text-[color:var(--aw-prata)] hover:text-[color:var(--aw-tiffany)]">
          ← nova solicitação
        </Link>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10 w-full flex-1">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-2xl font-bold">Histórico</h2>
          <p className="text-sm text-[color:var(--aw-grafite)]">
            {solicitacoes.length} {solicitacoes.length === 1 ? 'solicitação' : 'solicitações'}
          </p>
        </div>

        {solicitacoes.length === 0 ? (
          <div className="border border-[color:var(--aw-prata)] p-10 text-center">
            <p className="text-[color:var(--aw-grafite)]">Nenhuma solicitação ainda.</p>
            <Link
              href="/"
              className="inline-block mt-4 bg-[color:var(--aw-tiffany)] text-black font-bold px-4 py-2 uppercase tracking-wider text-sm"
            >
              Criar a primeira
            </Link>
          </div>
        ) : (
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
        )}
      </div>

      <Rodape />
    </main>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="p-3 uppercase tracking-wider text-xs font-semibold">{children}</th>;
}

function formatarData(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}
