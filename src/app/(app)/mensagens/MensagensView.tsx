'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import type { MensagemView, PropostaView } from '@/db/repos/mensagens';
import { formatPhoneBR } from '@/domain/phone';
import { diaCurtoSP, hhmmSP } from '@/domain/time';
import { EmptyState, PageHead } from '@/ui/bits';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/icons';
import { Mono, gradientFor, initials } from '@/ui/Mono';
import { Segmented } from '@/ui/Segmented';
import { Sheet } from '@/ui/Sheet';
import { useToast } from '@/ui/Toast';
import { NovoAgendamentoSheet, type PetOpcao, type ServicoOpcao } from '../_components/NovoAgendamentoSheet';
import { abrirConversa, confirmarAction, pularAction, responderAction } from './actions';
import s from './mensagens.module.css';

type Item = { id: string; telefone: string; tutorId: string | null; tutorNome: string | null; petNome: string | null; naoLidas: number; ultimaTexto: string; ultimaEm: string };
type Conversa = Awaited<ReturnType<typeof abrirConversa>>;
const SEMANA = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
const nomeDe = (c: { tutorNome: string | null; telefone: string }) => c.tutorNome ?? formatPhoneBR(c.telefone);

export function MensagensView(props: {
  filtro: 'tutores' | 'outros'; conectado: boolean; conversas: Item[]; selecionada: string | null;
  lembretes: { dia: string; hora: string; itens: { tutorId: string; tutorNome: string; petNome: string }[] };
  hoje: string; pets: PetOpcao[]; servicos: ServicoOpcao[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [aberta, setAberta] = useState<string | null>(props.selecionada ?? props.conversas[0]?.id ?? null);
  const [conversa, setConversa] = useState<Conversa | null>(null);
  const [verLembretes, setVerLembretes] = useState(false);
  // Celular: lista ou conversa, uma de cada vez (no PC as duas aparecem lado a lado).
  const [vendo, setVendo] = useState(Boolean(props.selecionada));
  const primeira = props.conversas[0]?.id ?? null;
  useEffect(() => { setAberta((a) => (a && props.conversas.some((c) => c.id === a) ? a : primeira)); }, [props.filtro, primeira, props.conversas]);
  const recarregar = () => aberta && abrirConversa(aberta).then(setConversa);
  useEffect(() => { if (aberta) abrirConversa(aberta).then((c) => { setConversa(c); router.refresh(); }); else setConversa(null); }, [aberta, router]);
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') { router.refresh(); recarregar(); } }, 15_000);
    return () => clearInterval(t);
  });
  const quandoLembrete = props.lembretes.dia === props.hoje ? `Hoje às ${props.lembretes.hora}` : `Amanhã às ${props.lembretes.hora}`;
  return (
    <div className="view">
      <PageHead
        eyebrow={props.conectado ? 'WhatsApp conectado' : 'WhatsApp desconectado'}
        title="Mensagens"
        actions={<Button variant="tinted" onClick={() => setVerLembretes(true)}><Icon name="bell" />{`Próximos lembretes (${props.lembretes.itens.length})`}</Button>}
      />
      <div className={s.inbox} data-vendo={vendo}>
        <div className={s.left}>
          <Segmented label="Conversas" value={props.filtro} onChange={(f) => { setAberta(null); setVendo(false); router.push(`${pathname}?filtro=${f}`); }} options={[{ value: 'tutores', label: 'Tutores' }, { value: 'outros', label: 'Outros' }]} />
          {props.conversas.length ? (
            <div className="glist">
              {props.conversas.map((c) => (
                <button key={c.id} type="button" className="row ind" aria-current={c.id === aberta ? 'true' : undefined} onClick={() => { setAberta(c.id); setVendo(true); }}>
                  <Mono initials={c.tutorNome ? initials(c.tutorNome, 2) : '#'} gradient={gradientFor(c.tutorId ?? c.telefone)} />
                  <span className="grow">
                    <span className={s.linha}><b>{nomeDe(c)}</b><span className="cap num">{hhmmSP(new Date(c.ultimaEm))}</span></span>
                    <span className={`cap ${s.previa}`}>{c.ultimaTexto}</span>
                  </span>
                  {c.naoLidas > 0 && <><span className={s.dot} aria-hidden="true" /><span className="sr-only">Não lida</span></>}
                </button>
              ))}
            </div>
          ) : (
            <div className="card"><EmptyState icon="msg" text={props.filtro === 'tutores' ? 'Nenhuma conversa com tutores ainda.' : 'Nenhuma mensagem de outros números.'} /></div>
          )}
        </div>
        {conversa ? <Thread conversa={conversa} onChange={recarregar} pets={props.pets} servicos={props.servicos} onVoltar={() => setVendo(false)} /> : (
          <div className={`card ${s.vazio}`}><EmptyState icon="msg" text="Escolha uma conversa." /></div>
        )}
      </div>
      <Sheet open={verLembretes} onClose={() => setVerLembretes(false)} title={`${quandoLembrete} saem ${props.lembretes.itens.length} lembretes`} subtitle="Cada tutor recebe uma sugestão de horário livre">
        {props.lembretes.itens.length ? (
          <div className="glist">
            {props.lembretes.itens.map((i) => (
              <div className="row" key={i.tutorId}>
                <span className="grow"><b style={{ fontWeight: 600 }}>{i.petNome}</b><br /><span className="cap">{i.tutorNome}</span></span>
                <Button variant="gray" size="sm" onClick={async () => { await pularAction(i.tutorId, props.lembretes.dia); router.refresh(); }}>Tirar da lista</Button>
              </div>
            ))}
          </div>
        ) : <p className="muted" style={{ margin: 0 }}>Ninguém no ponto de voltar por enquanto.</p>}
        <Link className="btn gray" href="/configuracoes/mensagens">Editar o texto das mensagens</Link>
      </Sheet>
    </div>
  );
}

function Thread({ conversa, onChange, pets, servicos, onVoltar }: { conversa: Conversa; onChange: () => void; pets: PetOpcao[]; servicos: ServicoOpcao[]; onVoltar: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [texto, setTexto] = useState('');
  const [pending, start] = useTransition();
  const [ocupado, setOcupado] = useState<{ msg: string; proximo: string | null } | null>(null);
  const [outro, setOutro] = useState(false);
  const fim = useRef<HTMLDivElement>(null);
  useEffect(() => { fim.current?.scrollIntoView({ block: 'end' }); }, [conversa.mensagens.length]);
  useEffect(() => setOcupado(null), [conversa.id]);
  const p = conversa.proposta;
  const nome = conversa.tutorNome?.split(' ')[0] ?? formatPhoneBR(conversa.telefone);

  const confirmar = (inicioIso?: string) => start(async () => {
    const r = await confirmarAction(p!.id, inicioIso);
    if (!r.ok) return setOcupado({ msg: r.msg, proximo: r.proximo });
    setOcupado(null);
    toast(r.msg);
    onChange();
    router.refresh();
  });

  return (
    <section className={s.thread} aria-label={`Conversa com ${conversa.tutorNome ?? conversa.telefone}`}>
      <div className={s.head}>
        <button type="button" className={`so-celular ${s.voltar}`} onClick={onVoltar} aria-label="Conversas"><Icon name="left" /></button>
        <Mono initials={conversa.tutorNome ? initials(conversa.tutorNome, 2) : '#'} gradient={gradientFor(conversa.tutorId ?? conversa.telefone)} />
        <div><b>{conversa.tutorNome ?? formatPhoneBR(conversa.telefone)}</b><div className="cap">{conversa.petNome ? `Pet: ${conversa.petNome}` : formatPhoneBR(conversa.telefone)}</div></div>
        {conversa.petId ? <Link className="btn gray sm" style={{ marginLeft: 'auto' }} href={`/pets/${conversa.petId}`}>Ver ficha</Link>
          : <Link className="btn tinted sm" style={{ marginLeft: 'auto' }} href={`/pets/novo?telefone=${encodeURIComponent(conversa.telefone)}`}>Cadastrar tutor</Link>}
      </div>
      <div className={s.body}>
        {conversa.mensagens.map((m: MensagemView) => (
          <div key={m.id} className={s.grupo}>
            <div className={`${s.bub} ${m.direcao === 'out' ? s.out : s.in}`}>{m.texto}</div>
            <span className={`${s.meta} ${m.direcao === 'out' ? s.metaOut : ''}`}>
              {`${hhmmSP(m.em)}${m.automatica ? ', automática' : ''}${m.origem === 'celular' ? ', pelo celular' : ''}${m.status === 'fila' ? ', na fila' : ''}${m.status === 'falhou' ? ', não enviada' : ''}`}
            </span>
          </div>
        ))}
        <div ref={fim} />
      </div>
      {p && p.status !== 'descartada' && <Proposta p={p} nome={nome} pending={pending} ocupado={ocupado} onConfirmar={confirmar} onOutro={() => setOutro(true)} />}
      <form className={s.compose} onSubmit={(e) => { e.preventDefault(); if (!texto.trim()) return; start(async () => { await responderAction(conversa.id, texto); setTexto(''); onChange(); }); }}>
        <label htmlFor="msg" className="sr-only">{`Mensagem para ${nome}`}</label>
        <input id="msg" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Mensagem" autoComplete="off" />
        <button className={s.send} aria-label="Enviar" disabled={pending} onPointerDown={(e) => e.preventDefault()}><Icon name="send" /></button>
      </form>
      {outro && p && (
        <NovoAgendamentoSheet open onClose={() => setOutro(false)} pets={pets} servicos={servicos} dia={p.inicio.toISOString().slice(0, 10)} petId={p.petId} onDone={() => { onChange(); router.refresh(); }} />
      )}
    </section>
  );
}

function Proposta({ p, nome, pending, ocupado, onConfirmar, onOutro }: {
  p: PropostaView; nome: string; pending: boolean; ocupado: { msg: string; proximo: string | null } | null; onConfirmar: (iso?: string) => void; onOutro: () => void;
}) {
  const diaSemana = SEMANA[new Date(`${p.inicio.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' })}T12:00:00Z`).getUTCDay()];
  const quando = `${diaCurtoSP(p.inicio).split(',')[0]} às ${hhmmSP(p.inicio)}`;
  if (p.status === 'confirmada') {
    return (
      <div className={s.offer}>
        <span className="tile t-green" style={{ width: 40, height: 40, borderRadius: '50%' }}><Icon name="check" size="lg" /></span>
        <div style={{ flex: 1 }}><b>{`${p.petNome} agendado para ${quando}`}</b><div className="cap">{`Confirmação enviada para ${nome}`}</div></div>
      </div>
    );
  }
  return (
    <div className={s.offer}>
      <div className={s.od}><small>{diaSemana}</small><b className="num">{diaCurtoSP(p.inicio).slice(-5, -3)}</b></div>
      <div style={{ flex: '1 1 200px' }}>
        <b>{p.status === 'respondida' ? `${nome} aceitou ${quando}` : `Proposta enviada: ${quando}`}</b>
        <div className="cap">{`${p.petNome}, ${p.servicoNome}`}</div>
        {ocupado && <div className="err" role="alert" style={{ marginLeft: 0 }}>{ocupado.msg}</div>}
      </div>
      <div className="actions">
        {ocupado?.proximo ? (
          <Button busy={pending} busyLabel="Confirmando" onClick={() => onConfirmar(ocupado.proximo!)}>{`Confirmar ${hhmmSP(new Date(ocupado.proximo))}`}</Button>
        ) : !ocupado && (
          <Button busy={pending} busyLabel="Confirmando" onClick={() => onConfirmar()}>Confirmar</Button>
        )}
        <Button variant="gray" onClick={onOutro}>Outro horário</Button>
      </div>
    </div>
  );
}
