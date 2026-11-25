import { getUser } from '@/auth/current';
import { withSession } from '@/db/session';
import { listConversas, listLembretesProximoEnvio } from '@/db/repos/mensagens';
import { searchPets } from '@/db/repos/pets';
import { listServicos } from '@/db/repos/servicos';
import { dayKeySP } from '@/domain/time';
import { agora } from '@/lib/agora';
import { getProvider } from '@/whatsapp/provider';
import { MensagensView } from './MensagensView';

export default async function Page({ searchParams }: { searchParams: Promise<{ filtro?: string }> }) {
  const user = await getUser();
  const sp = await searchParams;
  const filtro = sp.filtro === 'outros' ? 'outros' : 'tutores';
  const data = await withSession(user, async (tx) => ({
    conversas: await listConversas(tx, filtro),
    lembretes: await listLembretesProximoEnvio(tx, agora()),
    pets: await searchPets(tx, ''),
    servicos: await listServicos(tx, true),
    liberado: (await tx<{ ok: boolean }[]>`select (whatsapp_liberado or demo) as ok from lojas where id = ${user.lojaId}`)[0]?.ok ?? false,
  }));
  const conexao = data.liberado ? await (await getProvider()).connection().catch(() => ({ state: 'close' as const })) : { state: 'close' as const };
  return (
    <MensagensView
      filtro={filtro}
      conectado={conexao.state === 'open'}
      liberado={data.liberado}
      conversas={data.conversas.map((c) => ({ ...c, ultimaEm: c.ultimaEm.toISOString() }))}
      lembretes={data.lembretes}
      hoje={dayKeySP(agora())}
      pets={data.pets.map((p) => ({ id: p.id, label: `${p.nome}, ${p.tutorNome}` }))}
      servicos={data.servicos.map((s) => ({ id: s.id, nome: s.nome }))}
    />
  );
}
