'use client';
import { useState } from 'react';
import type { Acabando, Modelo } from '@/db/repos/pacotes';
import { formatBRL } from '@/domain/money';
import { PORTES, PORTE_LABEL, type Premio } from '@/domain/types';
import { ActionForm } from '@/ui/ActionForm';
import { EmptyState, GroupList, PageHead, Tile } from '@/ui/bits';
import { Button } from '@/ui/Button';
import { Field } from '@/ui/Field';
import { Icon, type IconName } from '@/ui/icons';
import { Mono, gradientFor, initials } from '@/ui/Mono';
import { Sheet } from '@/ui/Sheet';
import { salvarModelo, salvarPremio } from './actions';
import { AvisarRenovacao } from './AvisarRenovacao';
import s from './pacotes.module.css';

const CORES = [s.p1, s.p2, s.p3];
const PREMIO_ICON: [IconName, 'orange' | 'teal' | 'pink'][] = [['star', 'orange'], ['drop', 'teal'], ['sparkle', 'pink']];
const data = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', timeZone: 'UTC' }).replace('.', '');

export function PacotesView({ modelos, acabando, premios, servicos, dona }: { modelos: Modelo[]; acabando: Acabando[]; premios: (Premio & { ativo: boolean })[]; servicos: { id: string; nome: string }[]; dona: boolean }) {
  const [novoModelo, setNovoModelo] = useState(false);
  const [novoPremio, setNovoPremio] = useState(false);
  return (
    <div className="view">
      <PageHead title="Pacotes e pontos" actions={dona && <Button onClick={() => setNovoModelo(true)}><Icon name="plus" />Criar pacote</Button>} />
      {modelos.length ? (
        <div className={s.grid}>
          {modelos.map((m, i) => (
            <div key={m.id} className={`${s.pkg} ${CORES[i % 3]}`}>
              <div><h2 className={s.nome}>{m.nome}</h2><div className={s.ps}>{`${m.banhos}x ${m.servicoNome}${m.porte ? `, porte ${PORTE_LABEL[m.porte].toLowerCase()}` : ''}, ${m.validadeDias} dias`}</div></div>
              <div className={s.rodape}><span className={`${s.pr} num`}>{formatBRL(m.precoCentavos).replace(',00', '')}</span><span className={s.ps}>{`${m.ativos} ${m.ativos === 1 ? 'ativo' : 'ativos'}`}</span></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card"><EmptyState icon="gift" text={dona ? 'Nenhum pacote ainda. Crie o primeiro, como “4 banhos no mês”.' : 'Nenhum pacote cadastrado. A dona cria os pacotes aqui.'} /></div>
      )}

      <GroupList label="Acabando, com 1 banho restante">
        {acabando.length ? acabando.map((a) => (
          <div className="row ind" key={a.pacoteClienteId}>
            <Mono initials={initials(a.petsNomes || a.tutorNome)} gradient={gradientFor(a.tutorId)} size="sm" />
            <span className="grow"><b style={{ fontWeight: 600 }}>{a.petsNomes || a.tutorNome}</b><br /><span className="cap">{`${a.tutorNome}, ${a.nome}, vence ${data(a.validoAte)}`}</span></span>
            <AvisarRenovacao pacoteClienteId={a.pacoteClienteId} avisado={a.avisado} />
          </div>
        )) : <div className="row"><span className="grow muted">Nenhum pacote no último banho.</span></div>}
      </GroupList>

      <div>
        <p className="glabel">Pontos: cada R$ 1 pago vira 1 ponto</p>
        <div className="glist">
          {premios.map((p, i) => {
            const [icon, cor] = PREMIO_ICON[i % 3];
            return (
              <div className="row ind" key={p.id}>
                <Tile icon={icon} color={cor} />
                <span className="grow">{p.nome}{p.servicoId && <><br /><span className="cap">{`Cobre um ${servicos.find((x) => x.id === p.servicoId)?.nome ?? 'serviço'}`}</span></>}</span>
                <span className="val">{`${p.pontos} pontos`}</span>
              </div>
            );
          })}
          {dona && <button type="button" className="row" onClick={() => setNovoPremio(true)} style={{ color: 'var(--tint)', fontWeight: 600 }}><Icon name="plus" size="sm" />Adicionar prêmio</button>}
          {!premios.length && !dona && <div className="row"><span className="muted">Nenhum prêmio cadastrado.</span></div>}
        </div>
      </div>

      <Sheet open={novoModelo} onClose={() => setNovoModelo(false)} title="Novo pacote">
        <ActionForm action={async (p, f) => { const r = await salvarModelo(p, f); if (r.ok) setNovoModelo(false); return r; }}>
          {(st, pending) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Nome do pacote" error={st.fieldErrors?.nome}><input className="input" name="nome" placeholder="4 banhos no mês" /></Field>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                <Field label="Preço" error={st.fieldErrors?.preco}><input className="input num" name="preco" inputMode="decimal" placeholder="260,00" /></Field>
                <Field label="Quantidade de atendimentos" error={st.fieldErrors?.banhos}><input className="input" name="banhos" type="number" min={1} defaultValue={4} /></Field>
              </div>
              <Field label="Serviço incluído" error={st.fieldErrors?.servicoId}>
                <select className="input" name="servicoId" defaultValue={servicos[0]?.id}>{servicos.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select>
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                <Field label="Porte (opcional)" error={st.fieldErrors?.porte}>
                  <select className="input" name="porte" defaultValue=""><option value="">Qualquer porte</option>{PORTES.map((p) => <option key={p} value={p}>{PORTE_LABEL[p]}</option>)}</select>
                </Field>
                <Field label="Validade (dias)" error={st.fieldErrors?.validade}><input className="input" name="validade" type="number" min={1} defaultValue={35} /></Field>
              </div>
              <Button size="lg" busy={pending} busyLabel="Salvando">Salvar pacote</Button>
            </div>
          )}
        </ActionForm>
      </Sheet>

      <Sheet open={novoPremio} onClose={() => setNovoPremio(false)} title="Novo prêmio">
        <ActionForm action={async (p, f) => { const r = await salvarPremio(p, f); if (r.ok) setNovoPremio(false); return r; }}>
          {(st, pending) => (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Prêmio" error={st.fieldErrors?.nome}><input className="input" name="nome" placeholder="Hidratação grátis" /></Field>
              <Field label="Pontos necessários" error={st.fieldErrors?.pontos}><input className="input" name="pontos" type="number" min={1} defaultValue={500} /></Field>
              <Field label="Cobre um serviço (opcional)" help="Se escolher, o serviço sai de graça na hora de receber.">
                <select className="input" name="servicoId" defaultValue=""><option value="">Não, é um brinde</option>{servicos.map((x) => <option key={x.id} value={x.id}>{x.nome}</option>)}</select>
              </Field>
              <Button size="lg" busy={pending} busyLabel="Salvando">Salvar prêmio</Button>
            </div>
          )}
        </ActionForm>
      </Sheet>
    </div>
  );
}
