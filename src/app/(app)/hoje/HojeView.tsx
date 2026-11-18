'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { Hoje } from '@/db/repos/hoje';
import { formatBRL } from '@/domain/money';
import { PageHead, Tile, Widget } from '@/ui/bits';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/icons';
import { Mono, gradientFor, initials } from '@/ui/Mono';
import { Segmented } from '@/ui/Segmented';
import { NovoAgendamentoSheet, type PetOpcao, type ServicoOpcao } from '../_components/NovoAgendamentoSheet';
import { Quadro } from './Quadro';

function useAutoRefresh(ms: number) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') router.refresh(); }, ms);
    return () => clearInterval(t);
  }, [ms, router]);
}

export function HojeView({ dataLonga, titulo, dia, hoje, pets, servicos }: { dataLonga: string; titulo: string; dia: string; hoje: Hoje; pets: PetOpcao[]; servicos: ServicoOpcao[] }) {
  const router = useRouter();
  const [novo, setNovo] = useState(false);
  useAutoRefresh(15_000);
  const w = hoje.widgets;
  return (
    <div className="view">
      <PageHead
        eyebrow={dataLonga}
        title={titulo}
        actions={
          <>
            <Segmented label="Modo de exibição" value="quadro" onChange={(v) => v === 'linha' && router.push(`/agenda?dia=${dia}`)} options={[{ value: 'quadro', label: 'Quadro' }, { value: 'linha', label: 'Linha do tempo' }]} />
            <Button onClick={() => setNovo(true)}><Icon name="plus" />Agendar</Button>
          </>
        }
      />
      <div className="widgets">
        <div data-testid="widget-em-atendimento" style={{ display: 'contents' }}>
          <Widget title="Em atendimento" tile={<Tile icon="drop" color="teal" />} value={w.emAtendimento} sub={`de ${w.agendados} pets agendados hoje`} />
        </div>
        <Widget title="Para receber" tile={<Tile icon="wallet" color="orange" />} value={w.paraReceber.length} sub={w.paraReceber.length ? `${w.paraReceber.join(' e ')} ${w.paraReceber.length > 1 ? 'já estão prontos' : 'já está pronto'}` : 'Tudo recebido até agora'} />
        <Widget href="/mensagens" title="Respostas no WhatsApp" tile={<Tile icon="msg" color="green" />} value={w.respostas} sub="Tutores aceitando horários" />
        <Widget href="/caixa" title="Recebido hoje" tile={<Tile icon="cash" color="blue" />} value={formatBRL(w.recebidoCentavos).replace(',00', '')} sub={`${w.pagamentos} ${w.pagamentos === 1 ? 'pagamento' : 'pagamentos'}`} />
      </div>
      <Quadro colunas={hoje.colunas} />
      {hoje.noPontoDeVoltar.length > 0 && (
        <div className="card pad" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18 }}>
          <Tile icon="bell" color="pink" size={44} />
          <div style={{ flex: '1 1 280px' }}>
            <h2 className="title3">{`${hoje.noPontoDeVoltar.length} ${hoje.noPontoDeVoltar.length === 1 ? 'pet no ponto' : 'pets no ponto'} de voltar`}</h2>
            <p className="cap" style={{ margin: '2px 0 0' }}>O lembrete sai no WhatsApp no próximo envio diário, já com uma sugestão de horário.</p>
          </div>
          <div style={{ display: 'flex', paddingLeft: 8 }}>
            {hoje.noPontoDeVoltar.slice(0, 8).map((p) => (
              <span key={p.petId} style={{ marginLeft: -8, borderRadius: '50%', boxShadow: '0 0 0 2.5px var(--surface)' }} title={p.petNome}>
                <Mono initials={initials(p.petNome)} gradient={gradientFor(p.petId)} size="sm" />
              </span>
            ))}
          </div>
          <a className="btn tinted" href="/mensagens">Revisar</a>
        </div>
      )}
      <NovoAgendamentoSheet open={novo} onClose={() => setNovo(false)} pets={pets} servicos={servicos} dia={dia} onDone={() => router.refresh()} />
    </div>
  );
}
