import Link from 'next/link';
import { requireDona } from '@/auth/current';
import { Icon } from '@/ui/icons';
import { comecarDoZero } from './actions';
import s from './boas-vindas.module.css';

export default async function Page() {
  const user = await requireDona();
  return (
    <main className={s.page}>
      <div className={s.wrap}>
        <span className="app-icon" style={{ width: 64, height: 64, borderRadius: 16 }}><Icon name="paw" size="lg" /></span>
        <h1 className={s.title}>{`Bem-vinda, ${user.nome}`}</h1>
        <p className={s.sub}>Como você quer começar?</p>
        <div className={s.cards}>
          <Link href="/configuracoes/importar" className={s.card}>
            <span className="tile t-blue" style={{ width: 48, height: 48, borderRadius: 13 }}><Icon name="upload" size="lg" /></span>
            <b>Importar planilha</b>
            <span>Traga tutores, pets e a data da última visita. Os lembretes de retorno já começam a funcionar.</span>
          </Link>
          <form action={comecarDoZero} className={s.cardForm}>
            <button className={s.card}>
              <span className="tile t-green" style={{ width: 48, height: 48, borderRadius: 13 }}><Icon name="plus" size="lg" /></span>
              <b>Começar do zero</b>
              <span>Cadastre os clientes conforme forem chegando. Dá para importar uma planilha depois, nas Configurações.</span>
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
