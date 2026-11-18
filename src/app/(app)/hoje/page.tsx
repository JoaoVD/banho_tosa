import { getUser } from '@/auth/current';
import { withSession } from '@/db/session';
import { getHoje } from '@/db/repos/hoje';
import { searchPets } from '@/db/repos/pets';
import { listServicos } from '@/db/repos/servicos';
import { dayKeySP } from '@/domain/time';
import { agora } from '@/lib/agora';
import { HojeView } from './HojeView';

export default async function HojePage() {
  const user = await getUser();
  const now = agora();
  const dia = dayKeySP(now);
  const { hoje, pets, servicos } = await withSession(user, async (tx) => ({
    hoje: await getHoje(tx, dia, now),
    pets: await searchPets(tx, ''),
    servicos: await listServicos(tx, true),
  }));
  const data = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: 'numeric', month: 'long' });
  return (
    <HojeView
      dataLonga={data.charAt(0).toUpperCase() + data.slice(1)}
      titulo={`${hoje.saudacao}, ${user.nome.split(' ')[0]}`}
      dia={dia}
      hoje={hoje}
      pets={pets.map((p) => ({ id: p.id, label: `${p.nome}, ${p.tutorNome}` }))}
      servicos={servicos.map((s) => ({ id: s.id, nome: s.nome }))}
    />
  );
}
