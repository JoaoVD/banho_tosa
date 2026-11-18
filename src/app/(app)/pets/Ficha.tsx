import Link from 'next/link';
import type { PetFicha } from '@/db/repos/pets';
import { formatPhoneBR } from '@/domain/phone';
import { PORTE_LABEL } from '@/domain/types';
import { EmptyState, GroupList } from '@/ui/bits';
import { Icon } from '@/ui/icons';
import { Mono, gradientFor, initials } from '@/ui/Mono';
import { Cuidados } from './Cuidados';
import { FotoPet } from './FotoPet';
import { LembretesSwitch } from './LembretesSwitch';
import s from './pets.module.css';

export function Ficha({ ficha, extras }: { ficha: PetFicha; extras?: React.ReactNode }) {
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
        </div>
      </div>
      {extras}
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
        <div className="card"><EmptyState text="Ainda sem atendimentos. O primeiro aparece aqui assim que for pago." /></div>
      </div>
    </>
  );
}
