import { getUser } from '@/auth/current';
import { withSession } from '@/db/session';
import { listDia, resumoSemana } from '@/db/repos/agenda';
import { searchPets } from '@/db/repos/pets';
import { listServicos } from '@/db/repos/servicos';
import { addDaysKey, dayKeySP } from '@/domain/time';
import { agora } from '@/lib/agora';
import { AgendaView } from './AgendaView';

const DIA = /^\d{4}-\d{2}-\d{2}$/;

function semanaDe(dia: string): string[] {
  const dow = new Date(`${dia}T12:00:00Z`).getUTCDay();
  const segunda = addDaysKey(dia, dow === 0 ? -6 : 1 - dow);
  return Array.from({ length: 7 }, (_, i) => addDaysKey(segunda, i));
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await getUser();
  const sp = await searchParams;
  const hoje = dayKeySP(agora());
  const dia = sp.dia && DIA.test(sp.dia) ? sp.dia : hoje;
  const modo = sp.modo === 'semana' ? 'semana' : 'dia';
  const semana = semanaDe(dia);
  const data = await withSession(user, async (tx) => {
    const [d, pets, servicos] = await Promise.all([listDia(tx, dia), searchPets(tx, ''), listServicos(tx, true)]);
    const resumo = modo === 'semana' ? await resumoSemana(tx, semana) : null;
    return { d, pets, servicos, resumo };
  });
  return (
    <AgendaView
      dia={dia}
      hoje={hoje}
      agoraIso={agora().toISOString()}
      modo={modo}
      semana={semana}
      profissionais={data.d.profissionais}
      expediente={data.d.expediente}
      blocos={data.d.blocos.map((b) => ({ ...b, inicio: b.inicio.toISOString(), fim: b.fim.toISOString() }))}
      livres={Object.fromEntries(Object.entries(data.d.livres).map(([k, v]) => [k, v.map((g) => ({ inicio: g.inicio.toISOString(), fim: g.fim.toISOString() }))]))}
      resumo={data.resumo ? Object.fromEntries(Object.entries(data.resumo).map(([d, r]) => [d, Object.fromEntries(Object.entries(r).map(([p, x]) => [p, { total: x.total, primeiroLivre: x.primeiroLivre?.toISOString() ?? null }]))])) : null}
      pets={data.pets.map((p) => ({ id: p.id, label: `${p.nome}, ${p.tutorNome}` }))}
      servicos={data.servicos.map((s) => ({ id: s.id, nome: s.nome }))}
      abrirNovo={sp.novo === '1'}
      petInicial={sp.pet}
    />
  );
}
