import { redirect } from 'next/navigation';
import { getUser } from '@/auth/current';
import { withSession } from '@/db/session';
import { totalNaoLidas } from '@/db/repos/mensagens';
import { getProvider } from '@/whatsapp/provider';
import { sairAction } from '@/app/entrar/actions';
import { Sidebar } from '@/ui/Sidebar';
import { TabBar } from '@/ui/TabBar';
import { Toolbar } from '@/ui/Toolbar';
import { ToastProvider } from '@/ui/Toast';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  const [loja] = await withSession(user, (tx) => tx<{ nome: string; onboarding: boolean; tutores: number; whatsapp: boolean }[]>`
    select nome, onboarding_concluido as onboarding, whatsapp_liberado as whatsapp,
      (select count(*)::int from tutores where loja_id = ${user.lojaId}) as tutores
    from lojas where id = ${user.lojaId}`);
  const naoLidas = await withSession(user, totalNaoLidas);
  // Loja sem WhatsApp liberado (o número do servidor é de outra loja): sempre desconectado.
  const whatsappOk = Boolean(loja?.whatsapp) && (await (await getProvider()).connection().catch(() => ({ state: 'close' }))).state === 'open';
  // Primeiro acesso da dona: escolher entre importar planilha e começar do zero.
  if (user.papel === 'dona' && loja && !loja.onboarding && loja.tutores === 0) redirect('/boas-vindas');
  return (
    <ToastProvider>
      <div className="app">
        <Sidebar papel={user.papel} nomeLoja={loja?.nome ?? 'Banho e Tosa'} naoLidas={naoLidas} sair={sairAction} />
        <div className="work">
          <Toolbar whatsappOk={whatsappOk} />
          <main className="content" id="conteudo" tabIndex={-1}>{children}</main>
        </div>
        <TabBar papel={user.papel} nomeLoja={loja?.nome ?? 'Banho e Tosa'} naoLidas={naoLidas} whatsappOk={whatsappOk} sair={sairAction} />
      </div>
    </ToastProvider>
  );
}
