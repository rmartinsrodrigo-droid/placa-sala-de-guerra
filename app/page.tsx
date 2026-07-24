import FormularioPlaca from './formulario-placa';
import Rodape from './rodape';

export default function Home() {
  return (
    <main className="flex-1 flex flex-col">
      <FormularioPlaca />
      <Rodape />
    </main>
  );
}
