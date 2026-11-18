'use client';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Button } from '@/ui/Button';
import { Ring } from '@/ui/Ring';
import { Sheet } from '@/ui/Sheet';
import { fixarCicloAction } from './actions';
import s from './pets.module.css';

export type CicloView = { diasDesde: number | null; voltaEm: number | null; cicloDias: number; sugerido: boolean };
export type PacoteView = { saldo: number; total: number; validoAte: string } | null;

function textoVolta(c: CicloView) {
  if (c.voltaEm === null) return 'Sem visitas ainda';
  if (c.voltaEm <= 0) return 'Hora de voltar';
  return c.voltaEm === 1 ? 'Volta amanhã' : `Volta em ${c.voltaEm} dias`;
}

export function Aneis({ petId, ciclo, pacote, pontos, meta = 500 }: { petId: string; ciclo: CicloView; pacote: PacoteView; pontos: number; meta?: number }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  const [dias, setDias] = useState(String(ciclo.cicloDias));
  const [pending, start] = useTransition();
  const pctCiclo = ciclo.diasDesde === null ? 0 : (ciclo.diasDesde / ciclo.cicloDias) * 100;
  const faltam = Math.max(meta - pontos, 0);
  return (
    <div className={s.trio}>
      <div className={`card ${s.stat}`}>
        <Ring percent={pctCiclo} text={ciclo.diasDesde === null ? '–' : `${ciclo.diasDesde}d`} label={ciclo.diasDesde === null ? 'Sem visitas' : `${ciclo.diasDesde} de ${ciclo.cicloDias} dias desde o último banho`} tone={ciclo.voltaEm !== null && ciclo.voltaEm <= 1 ? 'orange' : 'tint'} />
        <div>
          <div className="cap">Último banho</div>
          <div className={s.big}>{textoVolta(ciclo)}</div>
          <button type="button" className="cap" style={{ border: 0, background: 'none', padding: 0, color: 'var(--tint)', fontWeight: 600, cursor: 'pointer' }} onClick={() => setAberto(true)}>
            {`Ciclo de ${ciclo.cicloDias} dias${ciclo.sugerido ? '' : ' (fixo)'}`}
          </button>
        </div>
      </div>
      <div className={`card ${s.stat}`}>
        <Ring percent={pacote ? (pacote.saldo / pacote.total) * 100 : 0} text={pacote ? `${pacote.saldo}/${pacote.total}` : '–'} label={pacote ? `${pacote.saldo} de ${pacote.total} banhos restantes` : 'Sem pacote'} tone={pacote && pacote.saldo <= 1 ? 'orange' : 'tint'} />
        <div>
          <div className="cap">Pacote</div>
          <div className={s.big}>{pacote ? (pacote.saldo === 1 ? '1 banho restante' : `${pacote.saldo} banhos`) : 'Sem pacote'}</div>
          <div className="cap">{pacote ? `Vence em ${new Date(`${pacote.validoAte}T12:00:00Z`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', timeZone: 'UTC' })}` : 'Ofereça um pacote no balcão'}</div>
        </div>
      </div>
      <div className={`card ${s.stat}`}>
        <Ring percent={(Math.min(pontos, meta) / meta) * 100} text={`${Math.round((Math.min(pontos, meta) / meta) * 100)}%`} label={`${pontos} de ${meta} pontos`} />
        <div>
          <div className="cap">Pontos</div>
          <div className={`${s.big} num`}>{pontos}</div>
          <div className="cap">{faltam ? `Faltam ${faltam} para o próximo prêmio` : 'Já pode trocar por um prêmio'}</div>
        </div>
      </div>
      <Sheet open={aberto} onClose={() => setAberto(false)} title="Ciclo de retorno" subtitle="De quantos em quantos dias o pet costuma voltar">
        <div className="field"><label htmlFor="ciclo-dias">Dias</label><input id="ciclo-dias" className="input" type="number" min={1} value={dias} onChange={(e) => setDias(e.target.value)} /></div>
        <p className="help" style={{ margin: 0 }}>Sem fixar, o sistema calcula pelo histórico depois da terceira visita.</p>
        <Button size="lg" busy={pending} busyLabel="Salvando" onClick={() => start(async () => { await fixarCicloAction(petId, Number(dias)); setAberto(false); router.refresh(); })}>Fixar ciclo</Button>
        {!ciclo.sugerido && <Button variant="gray" size="lg" onClick={() => start(async () => { await fixarCicloAction(petId, null); setAberto(false); router.refresh(); })}>Voltar ao cálculo automático</Button>}
      </Sheet>
    </div>
  );
}
