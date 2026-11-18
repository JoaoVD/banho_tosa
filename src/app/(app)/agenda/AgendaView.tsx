'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { atSP, hhmmSP } from '@/domain/time';
import type { Etapa } from '@/domain/types';
import { PageHead } from '@/ui/bits';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/icons';
import { Mono, gradientFor, initials } from '@/ui/Mono';
import { Segmented } from '@/ui/Segmented';
import { Sheet } from '@/ui/Sheet';
import { useToast } from '@/ui/Toast';
import { NovoAgendamentoSheet, type PetOpcao, type ServicoOpcao } from '../_components/NovoAgendamentoSheet';
import { buscarHorarios, cancelarAction, naoCompareceuAction, remarcarAction, type OpcaoHorario } from './actions';
import s from './agenda.module.css';

type Bloco = { id: string; agendamentoId: string; servicoId: string; profissionalId: string; inicio: string; fim: string; petId: string; petNome: string; tutorNome: string; servicoNome: string; etapa: Etapa };
type Prof = { id: string; nome: string; funcao: 'banho' | 'tosa' };
type Gap = { inicio: string; fim: string };

const H = 66;
const DIAS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

function estado(b: Bloco, agora: number): 'done' | 'now' | 'next' {
  if (b.etapa === 'concluido' || b.etapa === 'pronto') return 'done';
  const ini = Date.parse(b.inicio), fim = Date.parse(b.fim);
  if (ini <= agora && agora < fim) return 'now';
  return fim <= agora ? 'done' : 'next';
}

export function AgendaView(props: {
  dia: string; hoje: string; agoraIso: string; modo: 'dia' | 'semana'; semana: string[];
  profissionais: Prof[]; expediente: { abre: string; fecha: string } | null; blocos: Bloco[]; livres: Record<string, Gap[]>;
  resumo: Record<string, Record<string, { total: number; primeiroLivre: string | null }>> | null;
  pets: PetOpcao[]; servicos: ServicoOpcao[]; abrirNovo: boolean; petInicial?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [novo, setNovo] = useState<{ open: boolean; hora?: string }>({ open: props.abrirNovo });
  const [selecionado, setSelecionado] = useState<Bloco | null>(null);
  const [ano, mes] = props.dia.split('-').map(Number);
  const exp = props.expediente ?? { abre: '08:00', fecha: '18:00' };
  const abre = atSP(props.dia, exp.abre).getTime();
  const horas = Array.from({ length: Math.ceil((atSP(props.dia, exp.fecha).getTime() - abre) / 3_600_000) }, (_, i) => hhmmSP(new Date(abre + i * 3_600_000)).replace(':00', 'h'));
  const y = (iso: string) => ((Date.parse(iso) - abre) / 3_600_000) * H;
  const agora = Date.parse(props.agoraIso);
  const url = (q: Record<string, string>) => `${pathname}?${new URLSearchParams({ dia: props.dia, modo: props.modo, ...q })}`;

  return (
    <div className="view">
      <PageHead
        eyebrow={`${MESES[mes - 1][0].toUpperCase()}${MESES[mes - 1].slice(1)} de ${ano}`}
        title="Agenda"
        actions={
          <>
            <Segmented label="Período" value={props.modo} onChange={(m) => router.push(url({ modo: m }))} options={[{ value: 'dia', label: 'Dia' }, { value: 'semana', label: 'Semana' }]} />
            <Button onClick={() => setNovo({ open: true })}><Icon name="plus" />Agendar</Button>
          </>
        }
      />
      <nav className={`card ${s.week}`} aria-label="Dias da semana">
        <Link className="ibtn" href={url({ dia: addDays(props.semana[0], -7) })} aria-label="Semana anterior"><Icon name="left" /></Link>
        <div className={s.days}>
          {props.semana.map((d) => {
            const dt = new Date(`${d}T12:00:00Z`);
            const atual = d === props.dia;
            return (
              <Link key={d} href={url({ dia: d })} className={`${s.day} ${atual ? s.dayOn : ''}`} aria-current={atual ? 'date' : undefined}>
                <span>{DIAS[dt.getUTCDay()]}</span>
                <b className="num">{dt.getUTCDate()}</b>
                {d === props.hoje && <i aria-label="hoje" />}
              </Link>
            );
          })}
        </div>
        <Link className="ibtn" href={url({ dia: addDays(props.semana[0], 7) })} aria-label="Próxima semana"><Icon name="chev" /></Link>
      </nav>

      {props.modo === 'semana' && props.resumo ? (
        <div className="card pad" style={{ overflowX: 'auto' }}>
          <table className={s.table}>
            <thead><tr><th>Dia</th>{props.profissionais.map((p) => <th key={p.id}>{p.nome}</th>)}</tr></thead>
            <tbody>
              {props.semana.map((d) => (
                <tr key={d}>
                  <th scope="row"><Link href={url({ dia: d, modo: 'dia' })}>{DIAS[new Date(`${d}T12:00:00Z`).getUTCDay()]} {d.slice(8)}/{d.slice(5, 7)}</Link></th>
                  {props.profissionais.map((p) => {
                    const r = props.resumo![d]?.[p.id];
                    return <td key={p.id}>{r?.total ?? 0} atend.{r?.primeiroLivre ? <span className="cap">{` · livre às ${hhmmSP(new Date(r.primeiroLivre))}`}</span> : <span className="cap"> · lotado</span>}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : !props.expediente ? (
        <div className="card pad"><p className="muted" style={{ margin: 0 }}>A loja não abre neste dia. Ajuste em Configurações › Horário de funcionamento.</p></div>
      ) : (
        <div className={s.scroll}>
          <div className={s.cal} style={{ gridTemplateColumns: `56px repeat(${props.profissionais.length}, minmax(250px, 1fr))` }}>
            <div />
            {props.profissionais.map((p) => (
              <div className={s.hd} key={p.id}>
                <Mono initials={initials(p.nome, 2)} gradient={gradientFor(p.id)} size="sm" />
                <div><b>{p.nome}</b><div className="cap">{p.funcao === 'banho' ? 'Banho' : 'Tosa'}</div></div>
              </div>
            ))}
            <div>{horas.map((h) => <div className={s.hr} key={h}>{h}</div>)}</div>
            {props.profissionais.map((p) => (
              <section key={p.id} className={s.lane} style={{ height: horas.length * H }} aria-label={`${p.nome}, ${p.funcao}`}>
                {props.blocos.filter((b) => b.profissionalId === p.id).map((b) => (
                  <button key={b.id} type="button" className={`${s.ev} ${s[estado(b, agora)]}`} style={{ top: y(b.inicio) + 3, height: Math.max(y(b.fim) - y(b.inicio) - 6, 24) }} onClick={() => setSelecionado(b)}>
                    <b>{b.petNome}</b><span>{`${hhmmSP(new Date(b.inicio))}, ${b.servicoNome}`}</span>
                  </button>
                ))}
                {(props.livres[p.id] ?? []).filter((g) => props.dia !== props.hoje || Date.parse(g.fim) > agora).map((g) => {
                  const ini = props.dia === props.hoje ? new Date(Math.max(Date.parse(g.inicio), Math.ceil(agora / 1_800_000) * 1_800_000)).toISOString() : g.inicio;
                  if (Date.parse(g.fim) - Date.parse(ini) < 1_800_000) return null;
                  const hora = hhmmSP(new Date(ini));
                  return (
                    <button key={g.inicio} type="button" className={`${s.ev} ${s.free}`} style={{ top: y(ini) + 3, height: y(g.fim) - y(ini) - 6 }} onClick={() => setNovo({ open: true, hora })}>
                      <Icon name="plus" size="sm" />{`Livre às ${hora}`}
                    </button>
                  );
                })}
                {props.dia === props.hoje && agora >= abre && agora <= abre + horas.length * 3_600_000 && <div className={s.nowline} style={{ top: y(props.agoraIso) }} aria-hidden="true" />}
              </section>
            ))}
          </div>
        </div>
      )}

      <NovoAgendamentoSheet
        open={novo.open}
        onClose={() => { setNovo({ open: false }); if (props.abrirNovo) router.replace(url({})); }}
        pets={props.pets}
        servicos={props.servicos}
        dia={props.dia}
        hora={novo.hora}
        petId={props.petInicial}
        onDone={() => router.refresh()}
      />
      {selecionado && <AcoesBloco bloco={selecionado} onClose={() => setSelecionado(null)} />}
    </div>
  );
}

function addDays(dia: string, n: number) {
  const [y, m, d] = dia.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

function AcoesBloco({ bloco, onClose }: { bloco: Bloco; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [modo, setModo] = useState<'menu' | 'remarcar' | 'cancelar'>('menu');
  const [dia, setDia] = useState(bloco.inicio.slice(0, 10));
  const [opcoes, setOpcoes] = useState<OpcaoHorario[]>([]);
  const [escolha, setEscolha] = useState('');
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fim = () => { router.refresh(); onClose(); };
  return (
    <Sheet open onClose={onClose} title={bloco.petNome} subtitle={`${bloco.servicoNome}, ${hhmmSP(new Date(bloco.inicio))}. Tutor: ${bloco.tutorNome}`}
      leading={<Mono initials={initials(bloco.petNome)} gradient={gradientFor(bloco.petId)} />}>
      {modo === 'menu' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Link className="btn gray lg" href={`/pets/${bloco.petId}`}>Ver ficha do pet</Link>
          <Button variant="gray" size="lg" onClick={() => setModo('remarcar')}>Remarcar</Button>
          <Button variant="gray" size="lg" busy={pending} busyLabel="Registrando" onClick={() => start(async () => { await naoCompareceuAction(bloco.agendamentoId); toast(`${bloco.petNome}: não compareceu`); fim(); })}>Não compareceu</Button>
          <Button variant="danger" size="lg" onClick={() => setModo('cancelar')}>Cancelar agendamento</Button>
        </div>
      )}
      {modo === 'remarcar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field"><label htmlFor="rm-dia">Novo dia</label>
            <input id="rm-dia" className="input" type="date" value={dia} onChange={(e) => { setDia(e.target.value); setOpcoes([]); setEscolha(''); }} />
          </div>
          <Button variant="tinted" onClick={() => start(async () => { const o = await buscarHorarios(bloco.petId, bloco.servicoId, dia, bloco.agendamentoId); setOpcoes(o); setEscolha(o[0]?.value ?? ''); })}>Ver horários livres</Button>
          {opcoes.length > 0 && (
            <div className="field"><label htmlFor="rm-hora">Horário livre</label>
              <select id="rm-hora" className="input" value={escolha} onChange={(e) => setEscolha(e.target.value)}>{opcoes.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
            </div>
          )}
          {erro && <span className="err">{erro}</span>}
          <Button size="lg" disabled={!escolha} busy={pending} busyLabel="Remarcando" onClick={() => start(async () => { const r = await remarcarAction(bloco.agendamentoId, escolha); if (!r.ok) return setErro(r.msg); toast(r.msg); fim(); })}>Remarcar</Button>
        </div>
      )}
      {modo === 'cancelar' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="field"><label htmlFor="cc-motivo">Motivo (opcional)</label><input id="cc-motivo" className="input" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: tutor desmarcou" /></div>
          <Button variant="danger" size="lg" busy={pending} busyLabel="Cancelando" onClick={() => start(async () => { await cancelarAction(bloco.agendamentoId, motivo); toast('Agendamento cancelado'); fim(); })}>Cancelar agendamento</Button>
        </div>
      )}
    </Sheet>
  );
}
