'use client';
import type { Config } from '@/db/repos/config';
import { formatBRL } from '@/domain/money';
import { ActionForm } from '@/ui/ActionForm';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { salvarEnvio } from '../actions';

const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 } as const;

export function EnvioForm({ cfg }: { cfg: Config }) {
  return (
    <ActionForm action={salvarEnvio} className="card pad">
      {(s, pending) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <h2 className="title3">Lembretes de retorno</h2>
          <div style={grid}>
            <Field label="Horário do envio diário" error={s.fieldErrors?.horaLembrete}><input className="input" type="time" name="horaLembrete" defaultValue={cfg.horaLembrete} /></Field>
          </div>
          <h2 className="title3">Proteção do número</h2>
          <div style={grid}>
            <Field label="Enviar a partir de" error={s.fieldErrors?.envioInicio}><input className="input" type="time" name="envioInicio" defaultValue={cfg.envioInicio} /></Field>
            <Field label="Enviar até" error={s.fieldErrors?.envioFim}><input className="input" type="time" name="envioFim" defaultValue={cfg.envioFim} /></Field>
            <Field label="Teto diário de mensagens automáticas" error={s.fieldErrors?.tetoDiario}><input className="input" type="number" min={0} name="tetoDiario" defaultValue={cfg.tetoDiario} /></Field>
            <Field label="Intervalo mínimo (segundos)" error={s.fieldErrors?.intervaloMinS}><input className="input" type="number" min={0} name="intervaloMinS" defaultValue={cfg.intervaloMinS} /></Field>
            <Field label="Intervalo máximo (segundos)" error={s.fieldErrors?.intervaloMaxS} help="Entre um lembrete e outro, o sistema espera um tempo aleatório nessa faixa."><input className="input" type="number" min={0} name="intervaloMaxS" defaultValue={cfg.intervaloMaxS} /></Field>
          </div>
          <h2 className="title3">Caixa</h2>
          <div style={grid}>
            <Field label="Fundo de troco na gaveta" error={s.fieldErrors?.fundoTroco} help="Somado ao dinheiro esperado na conferência."><input className="input num" inputMode="decimal" name="fundoTroco" defaultValue={formatBRL(cfg.fundoTrocoCentavos).replace(/R\$\s?/, '')} /></Field>
          </div>
          <Button size="lg" busy={pending} busyLabel="Salvando">Salvar</Button>
        </div>
      )}
    </ActionForm>
  );
}
