const VERSAO = 'v1.3';
const DATA_ATUALIZACAO = '01/09/2026';

export default function Rodape() {
  return (
    <footer className="mt-16 border-t border-[color:var(--aw-prata)]/40 py-5 px-6 text-center">
      <p className="text-xs text-[color:var(--aw-grafite)]">
        Aplicação desenvolvida com IA pelo time de{' '}
        <a
          href="mailto:marketing@awnet.com.br"
          className="text-black underline decoration-[color:var(--aw-tiffany-forte)] underline-offset-2 hover:text-[color:var(--aw-tiffany-forte)]"
        >
          Marketing
        </a>
        {' '}· Versão: {VERSAO} ({DATA_ATUALIZACAO})
      </p>
    </footer>
  );
}
