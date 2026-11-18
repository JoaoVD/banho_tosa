'use client';
import { useEffect, useMemo, useState, useTransition } from 'react';
import type { Preview } from '@/db/repos/pagamentos';
import { formatBRL, parseBRL } from '@/domain/money';
import { pointsEarned } from '@/domain/points';
import { Button } from '@/ui/Button';
import { Icon, type IconName } from '@/ui/icons';
import { Mono, gradientFor, initials } from '@/ui/Mono';
import { Sheet } from '@/ui/Sheet';
import { Switch } from '@/ui/Switch';
import { useToast } from '@/ui/Toast';
import { prepararRecebimento, receberAction } from './receber-actions';
import s from './receber.module.css';

type Forma = 'pix' | 'credito' | 'debito' | 'dinheiro';
const FORMAS: { id: Forma; label: string; icon: IconName }[] = [
  { id: 'pix', label: 'Pix', icon: 'pix' },
  { id: 'credito', label: 'Crédito', icon: 'card' },
  { id: 'debito', label: 'Débito', icon: 'card' },
  { id: 'dinheiro', label: 'Dinheiro', icon: 'cash' },
];

export function ReceberSheet({ agendamentoId, onClose, onDone }: { agendamentoId: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [prev, setPrev] = useState<Preview | null>(null);
  const [incluidos, setIncluidos] = useState<string[]>([agendamentoId]);
  const [usarPacote, setUsarPacote] = useState(true);
  const [premioId, setPremioId] = useState<string | null>(null);
  const [forma, setForma] = useState<Forma>('pix');
  const [ajuste, setAjuste] = useState<{ aberto: boolean; valor: string; motivo: string }>({ aberto: false, valor: '', motivo: '' });
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [key] = useState(() => crypto.randomUUID());

  useEffect(() => { prepararRecebimento(incluidos).then(setPrev); }, [incluidos]);

  const conta = useMemo(() => {
    if (!prev) return null;
    const valores = new Map(prev.itens.map((i) => [i.agendamentoId, i.valorCentavos]));
    const ajusteCentavos = ajuste.aberto ? parseBRL(ajuste.valor) : null;
    if (ajusteCentavos !== null) valores.set(agendamentoId, ajusteCentavos);
    let pacoteItem: string | null = null;
    if (usarPacote && prev.pacoteUsavel) {
      const it = prev.itens.find((i) => i.servicoId === prev.pacoteUsavel!.servicoId);
      if (it) { valores.set(it.agendamentoId, 0); pacoteItem = it.agendamentoId; }
    }
    const premio = prev.premiosDisponiveis.find((p) => p.id === premioId);
    if (premio?.servicoId) {
      const it = prev.itens.find((i) => i.servicoId === premio.servicoId && valores.get(i.agendamentoId)! > 0);
      if (it) valores.set(it.agendamentoId, 0);
    }
    const total = [...valores.values()].reduce((a, b) => a + b, 0);
    return { total, pacoteItem, bruto: prev.itens.reduce((a, i) => a + i.valorCentavos, 0) };
  }, [prev, usarPacote, premioId, ajuste, agendamentoId]);

  const principal = prev?.itens.find((i) => i.agendamentoId === agendamentoId) ?? prev?.itens[0];
  const ajusteInvalido = ajuste.aberto && (parseBRL(ajuste.valor) === null || !ajuste.motivo.trim());

  function confirmar() {
    if (!prev || !conta) return;
    if (ajusteInvalido) return setErro('Para ajustar o preço, informe o valor e o motivo.');
    start(async () => {
      const r = await receberAction({
        idempotencyKey: key,
        agendamentoIds: incluidos,
        usarPacote,
        premioId: premioId ?? undefined,
        forma: conta.total > 0 ? forma : null,
        ajustes: ajuste.aberto ? [{ agendamentoId, valorCentavos: parseBRL(ajuste.valor)!, motivo: ajuste.motivo }] : undefined,
      });
      if (!r.ok) return setErro(r.error);
      toast(r.totalCentavos ? `Recebido de ${prev.tutor.nome.split(' ')[0]}` : `Banho do pacote usado, ${principal?.petNome ?? ''}`);
      onDone();
      onClose();
    });
  }

  return (
    <Sheet
      open
      onClose={onClose}
      title={prev ? `Receber de ${prev.tutor.nome.split(' ')[0]}` : 'Receber'}
      subtitle={prev ? prev.itens.map((i) => i.descricao).join(' · ') : undefined}
      leading={principal ? <Mono initials={initials(principal.petNome)} gradient={gradientFor(principal.petId)} /> : undefined}
    >
      {!prev || !conta ? (
        <p className="muted" aria-busy="true">Carregando…</p>
      ) : (
        <>
          <div className={s.total}>
            <div className="cap">Total</div>
            <div className={`${s.valor} num`}>{formatBRL(conta.total)}</div>
            <div className="cap">{conta.total ? `${principal?.petNome} ganha ${pointsEarned(conta.total)} pontos` : 'Banho do pacote, sem cobrança'}</div>
          </div>
          <div className="glist">
            {prev.pacoteUsavel && (
              <div className="row"><span className="grow">Usar banho do pacote<br /><span className="cap">{`${prev.pacoteUsavel.nome}: restam ${prev.pacoteUsavel.saldo} de ${prev.pacoteUsavel.total}`}</span></span>
                <Switch label="Usar banho do pacote" checked={usarPacote} onChange={setUsarPacote} /></div>
            )}
            {prev.premiosDisponiveis.map((p) => (
              <div className="row" key={p.id}><span className="grow">{`Trocar ${p.pontos} pontos`}<br /><span className="cap">{`${p.nome}, tem ${prev.saldoPontos}`}</span></span>
                <Switch label={`Trocar ${p.pontos} pontos`} checked={premioId === p.id} onChange={(v) => setPremioId(v ? p.id : null)} /></div>
            ))}
            {prev.outrosProntosDoTutor.map((o) => (
              <label className="row" key={o.agendamentoId}><span className="grow">{`Incluir ${o.petNome}`}<br /><span className="cap">{`Também está pronto, ${formatBRL(o.valorCentavos)}`}</span></span>
                <input type="checkbox" checked={incluidos.includes(o.agendamentoId)} onChange={(e) => setIncluidos((l) => (e.target.checked ? [...l, o.agendamentoId] : l.filter((x) => x !== o.agendamentoId)))} /></label>
            ))}
            <div className="row"><span className="grow">Ajustar preço</span><Switch label="Ajustar preço" checked={ajuste.aberto} onChange={(v) => setAjuste((a) => ({ ...a, aberto: v }))} /></div>
          </div>
          {ajuste.aberto && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <div className="field"><label htmlFor="aj-valor">{`Novo valor (${principal?.petNome})`}</label><input id="aj-valor" className="input num" inputMode="decimal" placeholder={formatBRL(principal?.valorCentavos ?? 0).replace(/R\$\s?/, '')} value={ajuste.valor} onChange={(e) => setAjuste((a) => ({ ...a, valor: e.target.value }))} /></div>
              <div className="field"><label htmlFor="aj-motivo">Motivo</label><input id="aj-motivo" className="input" placeholder="Ex.: cliente antigo" value={ajuste.motivo} onChange={(e) => setAjuste((a) => ({ ...a, motivo: e.target.value }))} /></div>
            </div>
          )}
          {conta.total > 0 && (
            <div role="group" aria-label="Forma de pagamento" className={s.formas}>
              {FORMAS.map((f) => (
                <button key={f.id} type="button" className={s.forma} aria-pressed={forma === f.id} onClick={() => setForma(f.id)}>
                  <Icon name={f.icon} size="lg" />{f.label}
                </button>
              ))}
            </div>
          )}
          {erro && <p className="err" role="alert" style={{ margin: 0 }}>{erro}</p>}
          <Button size="lg" busy={pending} busyLabel="Registrando" onClick={confirmar}>
            {conta.total ? `Receber ${formatBRL(conta.total)}` : 'Confirmar uso do pacote'}
          </Button>
        </>
      )}
    </Sheet>
  );
}
