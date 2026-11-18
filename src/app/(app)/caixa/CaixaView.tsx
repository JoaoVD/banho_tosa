'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { CaixaDia } from '@/db/repos/caixa';
import { drawerDiff } from '@/domain/cash';
import { formatBRL, parseBRL } from '@/domain/money';
import { addDaysKey, hhmmSP } from '@/domain/time';
import { Chip, GroupList, PageHead } from '@/ui/bits';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/icons';
import { Sheet } from '@/ui/Sheet';
import { useToast } from '@/ui/Toast';
import { estornarAction, fecharCaixaAction, reabrirAction } from './actions';
import s from './caixa.module.css';

const FORMAS = [
  { id: 'pix', label: 'Pix', cor: '#30A6C7' }, { id: 'credito', label: 'Crédito', cor: '#007AFF' },
  { id: 'debito', label: 'Débito', cor: '#FF9500' }, { id: 'dinheiro', label: 'Dinheiro', cor: '#34C759' },
] as const;
const ROTULO: Record<string, string> = { pix: 'Pix', credito: 'Crédito', debito: 'Débito', dinheiro: 'Dinheiro', pacote: 'Pacote' };

type View = Omit<CaixaDia, 'fechamento'> & { fechamento: { fechadoEm: string; contadoCentavos: number; diferencaCentavos: number } | null };

export function CaixaView({ caixa, hoje, proximoDia, dona }: { caixa: View; hoje: string; proximoDia: string; dona: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [contado, setContado] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [estorno, setEstorno] = useState<{ id: string; titulo: string } | null>(null);
  const [motivo, setMotivo] = useState('');
  const [pending, start] = useTransition();
  const { resumo, fechamento } = caixa;
  const total = resumo.totalCentavos;
  const valorContado = contado.trim() ? parseBRL(contado) : null;
  const diff = valorContado !== null ? drawerDiff(resumo.porForma.dinheiro, caixa.fundoTrocoCentavos, valorContado) : null;
  const dataLonga = new Date(`${caixa.dia}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });

  return (
    <div className="view">
      <PageHead
        eyebrow={dataLonga.charAt(0).toUpperCase() + dataLonga.slice(1)}
        title="Caixa"
        actions={
          <>
            <Link className="ibtn" href={`/caixa?dia=${addDaysKey(caixa.dia, -1)}`} aria-label="Dia anterior"><Icon name="left" /></Link>
            {caixa.dia !== hoje && <Link className="btn gray sm" href="/caixa">Hoje</Link>}
            <Link className="ibtn" href={`/caixa?dia=${addDaysKey(caixa.dia, 1)}`} aria-label="Próximo dia"><Icon name="chev" /></Link>
            {fechamento && <Chip tone="green" icon="check">{`Fechado às ${hhmmSP(new Date(fechamento.fechadoEm))}`}</Chip>}
          </>
        }
      />
      {fechamento && caixa.dia === hoje && proximoDia !== hoje && (
        <p className="cap" style={{ margin: 0 }}>Novos recebimentos de hoje entram no caixa de amanhã.</p>
      )}
      <div className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <div><div className="cap" style={{ fontWeight: 600 }}>Recebido no dia</div><div className={`${s.big} num`} data-testid="total-dia">{formatBRL(total)}</div></div>
        <div className={s.bars} role="img" aria-label="Divisão por forma de pagamento">
          {FORMAS.filter((f) => resumo.porForma[f.id]).map((f) => <span key={f.id} style={{ width: `${(resumo.porForma[f.id] / total) * 100}%`, background: f.cor }} />)}
        </div>
        <div className={s.legend}>
          {FORMAS.map((f) => (
            <div key={f.id}><span><i style={{ background: f.cor }} />{f.label}</span><b className="num">{formatBRL(resumo.porForma[f.id])}</b></div>
          ))}
        </div>
      </div>
      <div className={s.split}>
        <div className={s.lista}>
          <GroupList label="Pagamentos">
            {caixa.pagamentos.length ? caixa.pagamentos.map((p) => (
              <div className="row" key={p.id} style={p.estornado ? { opacity: 0.6 } : undefined}>
                <span className="cap num" style={{ width: 44 }}>{p.hora}</span>
                <span className="grow" style={p.estornado ? { textDecoration: 'line-through' } : undefined}><b style={{ fontWeight: 600 }}>{p.titulo}</b><br /><span className="cap">{p.detalhe}</span></span>
                {p.estornado ? <Chip tone="red">Estornado</Chip> : <span className="cap">{ROTULO[p.forma]}</span>}
                <span className="val" style={{ minWidth: 86, textAlign: 'right' }}>{formatBRL(p.valorCentavos)}</span>
                {!p.estornado && !fechamento && (
                  <button type="button" className="ibtn" aria-label={`Estornar ${p.titulo}`} onClick={() => setEstorno({ id: p.id, titulo: p.titulo })}><Icon name="undo" size="sm" /></button>
                )}
              </div>
            )) : <div className="row"><span className="muted">Nenhum pagamento neste dia.</span></div>}
          </GroupList>
        </div>
        <div className={s.gaveta}>
          <p className="glabel">Conferir a gaveta</p>
          <div className="glist">
            <div className="row"><span className="grow">Esperado em dinheiro</span><span className="val">{formatBRL(resumo.porForma.dinheiro + caixa.fundoTrocoCentavos)}</span></div>
            {fechamento ? (
              <>
                <div className="row"><span className="grow">Contado na gaveta</span><span className="val">{formatBRL(fechamento.contadoCentavos)}</span></div>
                <div className="row"><span className="grow">Diferença</span><DiffChip valor={fechamento.diferencaCentavos} /></div>
              </>
            ) : (
              <>
                <div className="row">
                  <label htmlFor="contado" className="grow">Contado na gaveta</label>
                  <input id="contado" className={`${s.campo} num`} inputMode="decimal" placeholder="0,00" value={contado} aria-invalid={contado.trim() && valorContado === null ? true : undefined} aria-describedby={contado.trim() && valorContado === null ? 'contado-err' : undefined} onChange={(e) => { setContado(e.target.value); setErro(null); }} />
                </div>
                <div className="row"><span className="grow">Diferença</span><span data-testid="diferenca" aria-live="polite">{diff ? <DiffChip valor={diff.diferenca} /> : '–'}</span></div>
              </>
            )}
          </div>
          {!fechamento && contado.trim() && valorContado === null && <span className="err" id="contado-err">Digite um valor como 80,00</span>}
          {erro && <span className="err" role="alert">{erro}</span>}
          {!fechamento ? (
            <>
              <Button size="lg" busy={pending} busyLabel="Fechando" onClick={() => start(async () => {
                const r = await fecharCaixaAction(caixa.dia, contado || '0');
                if (!r.ok) return setErro(r.error ?? null);
                toast('Caixa fechado');
                router.refresh();
              })}>Fechar caixa</Button>
              <span className="help" style={{ textAlign: 'center' }}>O resumo vai para o WhatsApp da dona da loja.</span>
            </>
          ) : dona && (
            <Button variant="gray" size="lg" busy={pending} busyLabel="Reabrindo" onClick={() => start(async () => { await reabrirAction(caixa.dia); toast('Caixa reaberto'); router.refresh(); })}>Reabrir caixa</Button>
          )}
        </div>
      </div>
      <Sheet open={!!estorno} onClose={() => setEstorno(null)} title={`Estornar ${estorno?.titulo ?? ''}`} subtitle="O valor sai do caixa e o atendimento volta para receber">
        <div className="field"><label htmlFor="estorno-motivo">Motivo</label><input id="estorno-motivo" className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: cobrado na forma errada" /></div>
        <Button variant="danger" size="lg" busy={pending} busyLabel="Estornando" onClick={() => start(async () => { await estornarAction(estorno!.id, motivo); setEstorno(null); setMotivo(''); toast('Pagamento estornado'); router.refresh(); })}>Estornar</Button>
      </Sheet>
    </div>
  );
}

function DiffChip({ valor }: { valor: number }) {
  if (valor === 0) return <Chip tone="green" icon="check">Confere</Chip>;
  return valor > 0 ? <Chip tone="orange">{`Sobram ${formatBRL(valor)}`}</Chip> : <Chip tone="red">{`Faltam ${formatBRL(-valor)}`}</Chip>;
}
