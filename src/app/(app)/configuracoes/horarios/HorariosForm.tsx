'use client';
import { useState } from 'react';
import type { Horario } from '@/db/repos/config';
import { ActionForm } from '@/ui/ActionForm';
import { Button } from '@/ui/Button';
import { Switch } from '@/ui/Switch';
import { salvarHorarios } from '../actions';

const DIAS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export function HorariosForm({ horarios }: { horarios: Horario[] }) {
  const [abertos, setAbertos] = useState(() => DIAS.map((_, d) => horarios.some((h) => h.diaSemana === d)));
  return (
    <ActionForm action={salvarHorarios}>
      {(s, pending) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="glist">
            {DIAS.map((nome, d) => {
              const h = horarios.find((x) => x.diaSemana === d);
              return (
                <div className="row" key={d} style={{ flexWrap: 'wrap' }}>
                  <span className="grow">{nome}{s.fieldErrors?.[`dia-${d}`] && <span className="err"> {s.fieldErrors[`dia-${d}`]}</span>}</span>
                  {abertos[d] && (
                    <>
                      <input className="input" style={{ width: 120 }} type="time" name={`abre-${d}`} aria-label={`${nome}, abre às`} defaultValue={h?.abre ?? '08:00'} />
                      <input className="input" style={{ width: 120 }} type="time" name={`fecha-${d}`} aria-label={`${nome}, fecha às`} defaultValue={h?.fecha ?? '18:00'} />
                    </>
                  )}
                  <Switch name={`aberto-${d}`} label={`${nome} aberto`} checked={abertos[d]} onChange={(v) => setAbertos((a) => a.map((x, i) => (i === d ? v : x)))} />
                </div>
              );
            })}
          </div>
          <Button size="lg" busy={pending} busyLabel="Salvando">Salvar horários</Button>
        </div>
      )}
    </ActionForm>
  );
}
