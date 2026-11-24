'use client';
import { useEffect, useState } from 'react';
import { ActionForm } from '@/ui/ActionForm';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { Sheet } from '@/ui/Sheet';
import { Switch } from '@/ui/Switch';
import { useToast } from '@/ui/Toast';
import { agendar, buscarHorarios, type OpcaoHorario } from '../agenda/actions';

export type PetOpcao = { id: string; label: string };
export type ServicoOpcao = { id: string; nome: string };

export function NovoAgendamentoSheet({
  open, onClose, pets, servicos, dia: diaInicial, hora, petId: petInicial, onDone,
}: {
  open: boolean; onClose: () => void; pets: PetOpcao[]; servicos: ServicoOpcao[];
  dia: string; hora?: string; petId?: string; onDone?: () => void;
}) {
  const [petId, setPetId] = useState(petInicial ?? '');
  const [servicoId, setServicoId] = useState(servicos.find((s) => s.nome === 'Banho')?.id ?? servicos[0]?.id ?? '');
  const [dia, setDia] = useState(diaInicial);
  const [opcoes, setOpcoes] = useState<OpcaoHorario[]>([]);
  const [inicio, setInicio] = useState('');
  const [confirmar, setConfirmar] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const toast = useToast();

  useEffect(() => { if (open) { setDia(diaInicial); setPetId(petInicial ?? ''); } }, [open, diaInicial, petInicial]);

  useEffect(() => {
    let vivo = true;
    if (!petId || !servicoId || !dia) { setOpcoes([]); setInicio(''); setCarregando(false); return; }
    setCarregando(true);
    buscarHorarios(petId, servicoId, dia).then((o) => {
      if (!vivo) return;
      setOpcoes(o);
      const preferido = hora ? o.find((x) => new Date(x.value).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }) === hora) : undefined;
      setInicio(preferido?.value ?? o[0]?.value ?? '');
      setCarregando(false);
    }).catch(() => {
      // Falhou a busca: não deixa o botão travado; o envio sem horário mostra o erro no campo.
      if (!vivo) return;
      setOpcoes([]);
      setInicio('');
      setCarregando(false);
    });
    return () => { vivo = false; };
  }, [petId, servicoId, dia, hora]);

  return (
    <Sheet open={open} onClose={onClose} title="Novo agendamento">
      <ActionForm
        action={async (prev, fd) => {
          const r = await agendar(prev, fd);
          if (!r.ok) return r;
          // O aviso sai daqui: a janela fecha antes de o formulário conseguir mostrá-lo.
          toast(r.msg ?? 'Agendado');
          onDone?.();
          onClose();
          return {};
        }}
      >
        {(s, pending) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Pet" error={s.fieldErrors?.petId}>
              <select className="input" name="petId" value={petId} onChange={(e) => setPetId(e.target.value)}>
                <option value="">Escolha o pet</option>
                {pets.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
            </Field>
            <Field label="Serviço" error={s.fieldErrors?.servicoId} help="A duração sai do serviço e do porte do pet.">
              <select className="input" name="servicoId" value={servicoId} onChange={(e) => setServicoId(e.target.value)}>
                {servicos.map((sv) => <option key={sv.id} value={sv.id}>{sv.nome}</option>)}
              </select>
            </Field>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              <Field label="Dia"><input className="input" type="date" value={dia} onChange={(e) => setDia(e.target.value)} /></Field>
              <Field label="Horário livre" error={s.fieldErrors?.inicio}>
                <select className="input" name="inicio" value={inicio} onChange={(e) => setInicio(e.target.value)} aria-busy={carregando || undefined}>
                  {!petId && <option value="">Escolha o pet primeiro</option>}
                  {petId && !opcoes.length && <option value="">{carregando ? 'Procurando…' : 'Nenhum horário livre'}</option>}
                  {opcoes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
            </div>
            <div className="glist">
              <div className="row"><span className="grow">Confirmar pelo WhatsApp</span><Switch name="confirmar" label="Confirmar pelo WhatsApp" checked={confirmar} onChange={setConfirmar} /></div>
            </div>
            {/* Só agenda depois que os horários livres chegaram (senão iria sem horário). */}
            <Button size="lg" busy={pending} busyLabel="Agendando" disabled={carregando}>Agendar</Button>
          </div>
        )}
      </ActionForm>
    </Sheet>
  );
}
