import Link from 'next/link';
import type { Atendimento, PetFicha } from '@/db/repos/pets';
import { formatBRL } from '@/domain/money';
import { Aneis, type CicloView, type PacoteView } from './Aneis';
import { ReceberAtalho } from './ReceberAtalho';
import { formatPhoneBR } from '@/domain/phone';
import { PORTE_LABEL } from '@/domain/types';
import { EmptyState, GroupList } from '@/ui/bits';
import { Icon } from '@/ui/icons';
import { Mono, gradientFor, initials } from '@/ui/Mono';
import { Cuidados } from './Cuidados';
import { FotoPet } from './FotoPet';
import { LembretesSwitch } from './LembretesSwitch';
import s from './pets.module.css';

export function Ficha({ ficha, ciclo, historico, pacote = null, pontos = 0, receberId = null }: { ficha: PetFicha; ciclo: CicloView; historico: Atendimento[]; pacote?: PacoteView; pontos?: number; receberId?: string | null }) {
  const descricao = [ficha.raca ?? (ficha.especie === 'gato' ? 'Gato' : 'Cão'), `porte ${PORTE_LABEL[ficha.porte].toLowerCase()}`].join(', ');
  return (
    <>
      <div className={`card ${s.hero}`}>
        <Mono initials={initials(ficha.nome)} gradient={gradientFor(ficha.id)} size="xl" photo={ficha.fotoUrl} />
        <h2>{ficha.nome}</h2>
        <p className="muted" style={{ margin: 0 }}>{descricao}</p>
        <FotoPet petId={ficha.id} />
        <div className={s.quick}>
          <Link className={s.qbtn} href="/mensagens"><Icon name="msg" size="lg" />Mensagem</Link>
          <Link className={s.qbtn} href={`/agenda?novo=1&pet=${ficha.id}`}><Icon name="cal" size="lg" />Agendar</Link>
          {receberId && <ReceberAtalho agendamentoId={receberId} />}
        </div>
      </div>
      <Aneis petId={ficha.id} ciclo={ciclo} pacote={pacote} pontos={pontos} />
      <GroupList label="Tutor">
        <div className="row"><span className="grow">Nome</span><span className="val">{ficha.tutor.nome}</span></div>
        <div className="row"><span className="grow">WhatsApp</span><span className="val">{formatPhoneBR(ficha.tutor.telefone)}</span></div>
        <div className="row"><span className="grow">Lembretes automáticos</span><LembretesSwitch tutorId={ficha.tutor.id} ativo={ficha.tutor.lembretesAtivos} /></div>
      </GroupList>
      <div>
        <p className="glabel">Cuidados</p>
        <Cuidados petId={ficha.id} cuidados={ficha.cuidados} />
      </div>
      <div>
        <p className="glabel">Atendimentos</p>
        {historico.length ? (
          <div className="glist">
            {historico.map((h) => (
              <div className="row" key={h.id}>
                <span className="cap num" style={{ width: 56 }}>{h.dia.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'America/Sao_Paulo' }).replace('.', '')}</span>
                <span className="grow">{h.servico}{h.profissional && <><br /><span className="cap">{`com ${h.profissional}`}</span></>}</span>
                {h.pacote ? <span className="chip tint">Pacote</span> : <span className="val">{h.valorCentavos !== null ? formatBRL(h.valorCentavos) : ''}</span>}
              </div>
            ))}
          </div>
        ) : (
          <div className="card"><EmptyState text="Ainda sem atendimentos. O primeiro aparece aqui assim que for pago." /></div>
        )}
      </div>
    </>
  );
}
