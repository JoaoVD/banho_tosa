import Link from 'next/link';
import { requireDona } from '@/auth/current';
import { withSession } from '@/db/session';
import { listServicos } from '@/db/repos/servicos';
import { formatBRL } from '@/domain/money';
import { GroupList, PageHead } from '@/ui/bits';
import { Icon } from '@/ui/icons';
import { Voltar } from '../Voltar';

export default async function Page() {
  const user = await requireDona();
  const servicos = await withSession(user, (tx) => listServicos(tx));
  return (
    <div className="view" style={{ maxWidth: 720 }}>
      <Voltar />
      <PageHead title="Serviços e preços" actions={<Link className="btn" href="/configuracoes/servicos/novo"><Icon name="plus" />Novo serviço</Link>} />
      <GroupList>
        {servicos.map((s) => (
          <Link key={s.id} href={`/configuracoes/servicos/${s.id}`} className="row">
            <span className="grow">{s.nome}<br /><span className="cap">A partir de {formatBRL(Math.min(...Object.values(s.precos).map((p) => p.precoCentavos)))}, volta a cada {s.cicloPadraoDias} dias{s.ativo ? '' : ', inativo'}</span></span>
            <Icon name="chev" size="sm" />
          </Link>
        ))}
      </GroupList>
    </div>
  );
}
