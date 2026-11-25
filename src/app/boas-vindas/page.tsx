import { redirect } from 'next/navigation';
import { requireDona } from '@/auth/current';
import { withSession } from '@/db/session';
import { getHorarios, getLoja, listProfissionais } from '@/db/repos/config';
import { precosParaAjuste } from '@/db/repos/onboarding';
import { Conversa } from './Conversa';
import s from './boas-vindas.module.css';

export const metadata = { title: 'Primeiro acesso · Banho e Tosa' };

export default async function Page() {
  const user = await requireDona();
  const d = await withSession(user, async (tx) => ({
    loja: await getLoja(tx),
    horarios: await getHorarios(tx),
    equipe: (await listProfissionais(tx, true)).map((p) => ({ id: p.id, nome: p.nome, funcao: p.funcao })),
    servicos: (await tx<{ n: number }[]>`select count(*)::int as n from servicos where loja_id = loja_atual() and ativo`)[0].n,
    precos: await precosParaAjuste(tx),
  }));
  if (d.loja.onboardingConcluido) redirect('/hoje');
  return (
    <main className={s.page}>
      <Conversa nome={user.nome.split(' ')[0]} loja={d.loja.nome} horarios={d.horarios} equipe={d.equipe} servicos={d.servicos} precos={d.precos} />
    </main>
  );
}
