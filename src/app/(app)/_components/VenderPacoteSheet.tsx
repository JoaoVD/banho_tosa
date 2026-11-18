'use client';
import { useEffect, useState, useTransition } from 'react';
import type { Modelo } from '@/db/repos/pacotes';
import { formatBRL } from '@/domain/money';
import { Button } from '@/ui/Button';
import { Icon, type IconName } from '@/ui/icons';
import { Sheet } from '@/ui/Sheet';
import { useToast } from '@/ui/Toast';
import { modelosParaVenda, venderAction } from '../pacotes/actions';
import s from './receber.module.css';

type Forma = 'pix' | 'credito' | 'debito' | 'dinheiro';
const FORMAS: { id: Forma; label: string; icon: IconName }[] = [
  { id: 'pix', label: 'Pix', icon: 'pix' }, { id: 'credito', label: 'Crédito', icon: 'card' },
  { id: 'debito', label: 'Débito', icon: 'card' }, { id: 'dinheiro', label: 'Dinheiro', icon: 'cash' },
];

export function VenderPacoteSheet({ tutorId, tutorNome, onClose, onDone }: { tutorId: string; tutorNome: string; onClose: () => void; onDone: () => void }) {
  const toast = useToast();
  const [modelos, setModelos] = useState<Modelo[] | null>(null);
  const [modeloId, setModeloId] = useState('');
  const [forma, setForma] = useState<Forma>('pix');
  const [pending, start] = useTransition();
  const [key] = useState(() => crypto.randomUUID());
  useEffect(() => { modelosParaVenda().then((m) => { setModelos(m); setModeloId(m[0]?.id ?? ''); }); }, []);
  const modelo = modelos?.find((m) => m.id === modeloId);
  return (
    <Sheet open onClose={onClose} title={`Vender pacote para ${tutorNome.split(' ')[0]}`} subtitle="Entra no caixa de hoje e soma pontos">
      {!modelos ? <p className="muted">Carregando…</p> : !modelos.length ? (
        <p className="muted">Nenhum pacote cadastrado. A dona cria os pacotes em Pacotes e pontos.</p>
      ) : (
        <>
          <div className="field"><label htmlFor="venda-modelo">Pacote</label>
            <select id="venda-modelo" className="input" value={modeloId} onChange={(e) => setModeloId(e.target.value)}>
              {modelos.map((m) => <option key={m.id} value={m.id}>{`${m.nome}, ${formatBRL(m.precoCentavos)}`}</option>)}
            </select>
            {modelo && <span className="help">{`${modelo.banhos}x ${modelo.servicoNome}${modelo.porte ? `, porte ${modelo.porte}` : ''}. Validade de ${modelo.validadeDias} dias.`}</span>}
          </div>
          <div role="group" aria-label="Forma de pagamento" className={s.formas}>
            {FORMAS.map((f) => (
              <button key={f.id} type="button" className={s.forma} aria-pressed={forma === f.id} onClick={() => setForma(f.id)}><Icon name={f.icon} size="lg" />{f.label}</button>
            ))}
          </div>
          <Button size="lg" busy={pending} busyLabel="Registrando" disabled={!modelo} onClick={() => start(async () => {
            await venderAction({ idempotencyKey: key, tutorId, modeloId, forma });
            toast(`Pacote vendido para ${tutorNome.split(' ')[0]}`);
            onDone();
            onClose();
          })}>{modelo ? `Vender por ${formatBRL(modelo.precoCentavos)}` : 'Vender'}</Button>
        </>
      )}
    </Sheet>
  );
}
