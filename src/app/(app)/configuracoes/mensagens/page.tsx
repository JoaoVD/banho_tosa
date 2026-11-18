import { requireDona } from '@/auth/current';
import { withSession } from '@/db/session';
import { DEFAULT_TEMPLATES, TIPOS_MENSAGEM, type TipoMensagem } from '@/domain/templates';
import { PageHead } from '@/ui/bits';
import { Voltar } from '../Voltar';
import { EditorMensagens } from './EditorMensagens';

export default async function Page() {
  const user = await requireDona();
  const rows = await withSession(user, (tx) => tx<{ tipo: TipoMensagem; texto: string }[]>`select tipo, texto from modelos_mensagem where loja_id = ${user.lojaId}`);
  const textos = Object.fromEntries(TIPOS_MENSAGEM.map((t) => [t, rows.find((r) => r.tipo === t)?.texto ?? DEFAULT_TEMPLATES[t]])) as Record<TipoMensagem, string>;
  const editados = rows.map((r) => r.tipo);
  return (
    <div className="view" style={{ maxWidth: 760 }}>
      <Voltar />
      <PageHead title="Mensagens automáticas" />
      <p className="muted" style={{ margin: 0 }}>Os textos entre chaves, como {'{pet}'}, são trocados pelos dados de cada cliente na hora do envio.</p>
      <EditorMensagens textos={textos} editados={editados} />
    </div>
  );
}
