'use client';
import { useState, useTransition } from 'react';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/icons';
import { salvarCuidados } from './actions';
import s from './pets.module.css';

export function Cuidados({ petId, cuidados }: { petId: string; cuidados: string[] }) {
  const [lista, setLista] = useState(cuidados);
  const [novo, setNovo] = useState('');
  const [pending, start] = useTransition();
  const salvar = (l: string[]) => {
    setLista(l);
    start(() => salvarCuidados(petId, l));
  };
  return (
    <div className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className={s.chips}>
        {lista.length === 0 && <span className="muted">Nada anotado. Escreva aqui o que a equipe precisa saber antes do banho.</span>}
        {lista.map((c) => (
          <span key={c} className="chip orange">
            <Icon name="alert" size="sm" />{c}
            <button type="button" className={s.chipx} aria-label={`Remover “${c}”`} onClick={() => salvar(lista.filter((x) => x !== c))}><Icon name="x" size="sm" /></button>
          </span>
        ))}
      </div>
      <form
        style={{ display: 'flex', gap: 8 }}
        onSubmit={(e) => {
          e.preventDefault();
          if (!novo.trim() || lista.includes(novo.trim())) return;
          salvar([...lista, novo.trim()]);
          setNovo('');
        }}
      >
        <label htmlFor={`cuidado-${petId}`} className="sr-only">Novo cuidado</label>
        <input id={`cuidado-${petId}`} className="input" value={novo} onChange={(e) => setNovo(e.target.value)} placeholder="Ex.: sensível nas patas" />
        <Button variant="tinted" busy={pending} busyLabel="Salvando">Adicionar</Button>
      </form>
    </div>
  );
}
