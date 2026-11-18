'use client';
import { useEffect } from 'react';
import type { ServicoComPrecos } from '@/db/repos/servicos';
import { formatBRL } from '@/domain/money';
import { PORTES, PORTE_LABEL } from '@/domain/types';
import { ActionForm } from '@/ui/ActionForm';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { useToast } from '@/ui/Toast';
import { salvarServico } from '../../actions';

const reais = (c: number) => formatBRL(c).replace(/R\$\s?/, '');

export function ServicoForm({ servico, recemCriado }: { servico: ServicoComPrecos | null; recemCriado: boolean }) {
  const toast = useToast();
  useEffect(() => { if (recemCriado) toast('Serviço salvo'); }, [recemCriado, toast]);
  return (
    <ActionForm action={salvarServico}>
      {(s, pending) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {servico && <input type="hidden" name="id" value={servico.id} />}
          <div className="card pad" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <Field label="Nome" error={s.fieldErrors?.nome}><input className="input" name="nome" defaultValue={servico?.nome} /></Field>
            <Field label="Ciclo de retorno (dias)" error={s.fieldErrors?.ciclo} help="Em quantos dias o pet costuma voltar."><input className="input" type="number" min={1} name="ciclo" defaultValue={servico?.cicloPadraoDias ?? 15} /></Field>
          </div>
          <div className="glist">
            <label className="row"><span className="grow">Inclui banho</span><input type="checkbox" name="incluiBanho" defaultChecked={servico?.incluiBanho ?? true} /></label>
            <label className="row"><span className="grow">Inclui tosa</span><input type="checkbox" name="incluiTosa" defaultChecked={servico?.incluiTosa ?? false} /></label>
            <label className="row"><span className="grow">Ativo (aparece para agendar)</span><input type="checkbox" name="ativo" defaultChecked={servico?.ativo ?? true} /></label>
          </div>
          {s.fieldErrors?.inclui && <span className="err">{s.fieldErrors.inclui}</span>}
          <p className="glabel" style={{ marginBottom: -8 }}>Preço e duração por porte</p>
          <div className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {PORTES.map((p) => (
              <div key={p} style={{ display: 'grid', gridTemplateColumns: '110px repeat(2, minmax(0, 1fr))', gap: 12, alignItems: 'start' }}>
                <span style={{ paddingTop: 12, fontWeight: 600 }}>{PORTE_LABEL[p]}</span>
                <Field label={`Preço ${PORTE_LABEL[p]}`} error={s.fieldErrors?.[`preco-${p}`]}>
                  <input className="input num" inputMode="decimal" name={`preco-${p}`} defaultValue={servico ? reais(servico.precos[p].precoCentavos) : ''} placeholder="0,00" />
                </Field>
                <Field label={`Duração ${PORTE_LABEL[p]} (min)`} error={s.fieldErrors?.[`duracao-${p}`]}>
                  <input className="input num" type="number" min={5} step={5} name={`duracao-${p}`} defaultValue={servico?.precos[p].duracaoMin ?? 60} />
                </Field>
              </div>
            ))}
          </div>
          <Button size="lg" busy={pending} busyLabel="Salvando">Salvar serviço</Button>
        </div>
      )}
    </ActionForm>
  );
}
