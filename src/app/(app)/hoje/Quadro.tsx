'use client';
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { useRouter } from 'next/navigation';
import { useState, useTransition, type KeyboardEvent } from 'react';
import type { CardPet } from '@/db/repos/hoje';
import { formatBRL } from '@/domain/money';
import { BOARD_LABEL, BOARD_STAGES, nextStage, stageVerb, type BoardStage } from '@/domain/stages';
import type { Etapa } from '@/domain/types';
import { Button } from '@/ui/Button';
import { Chip, EmptyState } from '@/ui/bits';
import { Icon, type IconName } from '@/ui/icons';
import { Mono, gradientFor, initials } from '@/ui/Mono';
import { Switch } from '@/ui/Switch';
import { useToast } from '@/ui/Toast';
import { concluirAvisoAction, moverAction } from './actions';
import { ReceberSheet } from '../_components/ReceberSheet';
import s from './hoje.module.css';

const COR: Record<BoardStage, string> = { chegando: 'var(--ink3)', banho: '#30A6C7', tosa: '#FF9500', pronto: '#34C759' };
const VAZIO: Record<BoardStage, [IconName, string]> = {
  chegando: ['in', 'Ninguém chegando agora.'],
  banho: ['drop', 'Banheira livre. Arraste um pet para cá.'],
  tosa: ['scis', 'Mesa de tosa livre.'],
  pronto: ['ready', 'Nenhum pet esperando o tutor.'],
};
const ICONE: Record<'banho' | 'tosa' | 'pronto', IconName> = { banho: 'drop', tosa: 'scis', pronto: 'ready' };

export function Quadro({ colunas }: { colunas: Record<BoardStage, CardPet[]> }) {
  const router = useRouter();
  const toast = useToast();
  const [, start] = useTransition();
  const [pegando, setPegando] = useState<{ id: string; alvo: number } | null>(null);
  const [aviso, setAviso] = useState('');
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const todos = Object.values(colunas).flat();

  function mover(card: CardPet, para: BoardStage) {
    const atual = BOARD_STAGES.find((st) => colunas[st].some((c) => c.agendamentoId === card.agendamentoId));
    if (atual === para || card.pago) return;
    start(async () => {
      const { de } = await moverAction(card.agendamentoId, para);
      router.refresh();
      toast(`${card.petNome} em “${BOARD_LABEL[para]}”`, {
        undo: () => start(async () => { await moverAction(card.agendamentoId, de); router.refresh(); }),
      });
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const card = todos.find((c) => c.agendamentoId === e.active.id);
    if (card && e.over) mover(card, e.over.id as BoardStage);
  }

  function teclado(card: CardPet, colunaAtual: number) {
    return (e: KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!pegando) {
          setPegando({ id: card.agendamentoId, alvo: colunaAtual });
          setAviso(`${card.petNome} selecionado. Use as setas para escolher a coluna e Espaço para soltar.`);
        } else {
          const destino = BOARD_STAGES[pegando.alvo];
          setPegando(null);
          setAviso(`${card.petNome} solto em ${BOARD_LABEL[destino]}.`);
          mover(card, destino);
        }
      } else if (pegando && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault();
        const alvo = Math.max(0, Math.min(BOARD_STAGES.length - 1, pegando.alvo + (e.key === 'ArrowRight' ? 1 : -1)));
        setPegando({ ...pegando, alvo });
        setAviso(`Soltar em ${BOARD_LABEL[BOARD_STAGES[alvo]]}?`);
      } else if (pegando && e.key === 'Escape') {
        setPegando(null);
        setAviso('Movimento cancelado.');
      }
    };
  }

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <p className="sr-only" aria-live="assertive">{aviso}</p>
      <div className={s.board}>
        {BOARD_STAGES.map((st, i) => (
          <Coluna key={st} stage={st} cards={colunas[st]} alvoTeclado={pegando?.alvo === i}>
            {colunas[st].map((c) => (
              <Cartao key={c.agendamentoId} card={c} stage={st} pegando={pegando?.id === c.agendamentoId} onMover={(p) => mover(c, p)} onKey={teclado(c, i)} />
            ))}
          </Coluna>
        ))}
      </div>
    </DndContext>
  );
}

function Coluna({ stage, cards, alvoTeclado, children }: { stage: BoardStage; cards: CardPet[]; alvoTeclado: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const [icone, texto] = VAZIO[stage];
  return (
    <section ref={setNodeRef} className={`${s.col} ${isOver || alvoTeclado ? s.over : ''}`} aria-label={BOARD_LABEL[stage]}>
      <div className={s.colH}><span className={s.dot} style={{ background: COR[stage] }} />{BOARD_LABEL[stage]}<span className={`${s.n} num`}>{cards.length}</span></div>
      {cards.length ? children : <EmptyState icon={icone} text={texto} />}
    </section>
  );
}

function Cartao({ card, stage, pegando, onMover, onKey }: { card: CardPet; stage: BoardStage; pegando: boolean; onMover: (p: BoardStage) => void; onKey: (e: KeyboardEvent<HTMLButtonElement>) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.agendamentoId, disabled: card.pago });
  const style = transform ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 10 } : undefined;
  const proxima = nextStage(card.etapa === 'agendado' ? 'chegando' : card.etapa, card) as Etapa | null;
  return (
    <article ref={setNodeRef} style={style} className={`${s.pet} ${isDragging || pegando ? s.dragging : ''}`} aria-label={`${card.petNome}, ${card.servicoNome}`}>
      <div className={s.top}>
        {!card.pago && (
          <button type="button" className={s.grip} {...attributes} {...listeners} aria-label={`Mover ${card.petNome}`} aria-pressed={pegando} aria-roledescription="item arrastável" onKeyDown={onKey}>
            <Icon name="grip" size="sm" />
          </button>
        )}
        <Mono initials={initials(card.petNome)} gradient={gradientFor(card.petId)} />
        <div style={{ minWidth: 0 }}><div className={s.nm}>{card.petNome}</div><div className={s.br}>{card.raca ?? ''}</div></div>
        <span className={`${s.tm} num`}>{card.hora}</span>
      </div>
      <div className={s.svc}>{card.servicoNome}</div>
      {(card.nota || card.pacote) && (
        <div className={s.meta}>
          {card.nota && <span className={s.note}>{card.nota}</span>}
          {card.pacote && <Chip tone="tint">{`Pacote ${card.pacote.usados}/${card.pacote.total}`}</Chip>}
        </div>
      )}
      {stage === 'pronto' ? <RodapePronto card={card} /> : proxima && proxima !== 'pronto' && proxima !== 'banho' && proxima !== 'tosa' ? null : proxima && (
        <Button variant="gray" size="sm" onClick={() => onMover(proxima as BoardStage)}>
          <Icon name={ICONE[proxima as 'banho' | 'tosa' | 'pronto']} size="sm" />{stageVerb(proxima as 'banho' | 'tosa' | 'pronto')}
        </Button>
      )}
    </article>
  );
}

function RodapePronto({ card }: { card: CardPet }) {
  const router = useRouter();
  const [enviar, setEnviar] = useState(true);
  const [pending, start] = useTransition();
  if (card.avisoPendente) {
    return (
      <div className={s.notice} role="group" aria-label="Avisar tutor">
        <p>{`${card.petNome} terminou. Avisar ${card.tutorNome.split(' ')[0]}?`}</p>
        <div className={s.switchrow}><span>Mensagem no WhatsApp</span><Switch label="Mensagem no WhatsApp" checked={enviar} onChange={setEnviar} /></div>
        <Button variant="orange" size="sm" busy={pending} busyLabel={enviar ? 'Enviando' : 'Concluindo'} onClick={() => start(async () => { await concluirAvisoAction(card.agendamentoId, enviar); router.refresh(); })}>Concluir</Button>
      </div>
    );
  }
  if (card.pago) return <div className={s.meta}><Chip tone="green" icon="check">Pago</Chip></div>;
  return <BotaoReceber card={card} />;
}

function BotaoReceber({ card }: { card: CardPet }) {
  const router = useRouter();
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Button variant="orange" size="sm" onClick={() => setAberto(true)}>{`Receber ${formatBRL(card.pacote ? 0 : card.precoCentavos)}`}</Button>
      {aberto && <ReceberSheet agendamentoId={card.agendamentoId} onClose={() => setAberto(false)} onDone={() => router.refresh()} />}
    </>
  );
}
