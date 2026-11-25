'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition, type ReactNode } from 'react';
import type { Horario } from '@/db/repos/config';
import type { PrecosPorNome } from '@/db/repos/onboarding';
import { PRESETS_HORARIO } from '@/domain/catalogo';
import { parseBRL } from '@/domain/money';
import { DIAS_CURTOS, ETAPAS, etapaInicial, resumoEquipe, resumoHorarios, type EtapaOnboarding } from '@/domain/onboarding';
import { PORTES, PORTE_LABEL, type Porte } from '@/domain/types';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/icons';
import { Segmented } from '@/ui/Segmented';
import {
  adicionarProfissionalAction, concluirAction, removerProfissionalAction, salvarHorariosAction, salvarServicosAction,
} from './actions';
import s from './boas-vindas.module.css';

type Pessoa = { id: string; nome: string; funcao: 'banho' | 'tosa' };
type Atual = EtapaOnboarding | 'pronto';

const ALTERAR: Partial<Record<EtapaOnboarding, string>> = { horarios: 'Alterar horários', equipe: 'Alterar equipe', servicos: 'Alterar serviços' };
const reais = (c: number) => (c / 100).toFixed(2).replace('.', ',');

/** Primeiro acesso em formato de conversa: cada resposta salva na hora e vira um balão. */
export function Conversa(props: { nome: string; loja: string; horarios: Horario[]; equipe: Pessoa[]; servicos: number; precos: PrecosPorNome }) {
  const [horarios, setHorarios] = useState(props.horarios);
  const [equipe, setEquipe] = useState(props.equipe);
  const [servicos, setServicos] = useState(props.servicos);
  const [precos, setPrecos] = useState(props.precos);
  const [atual, setAtual] = useState<Atual>(() => etapaInicial({ horarios: props.horarios.length, equipe: props.equipe.length, servicos: props.servicos }));
  const fim = useRef<HTMLDivElement>(null);
  useEffect(() => { fim.current?.scrollIntoView({ block: 'end', behavior: 'smooth' }); }, [atual]);

  const proxima = (feito: Partial<{ horarios: number; equipe: number; servicos: number }>) =>
    setAtual(etapaInicial({ horarios: horarios.length, equipe: equipe.length, servicos, ...feito }));
  const resposta: Record<EtapaOnboarding, string | null> = {
    horarios: horarios.length ? resumoHorarios(horarios) : null,
    equipe: equipe.length ? resumoEquipe(equipe) : null,
    servicos: servicos ? `${servicos} serviços com preços` : null,
    clientes: null,
  };
  const visiveis = atual === 'pronto' ? ETAPAS : ETAPAS.slice(0, ETAPAS.indexOf(atual) + 1);

  return (
    <div className={s.chat}>
      <header className={s.topo}>
        <span className="app-icon" aria-hidden="true"><Icon name="paw" /></span>
        <div><b>{props.loja}</b><span>Primeiro acesso</span></div>
      </header>
      <div className={s.log} role="log" aria-label="Primeiro acesso" aria-live="polite">
        <Bot>{`Oi, ${props.nome}! Vou te ajudar a deixar o ${props.loja} pronto. Leva uns 3 minutos.`}</Bot>
        {visiveis.map((e) => (
          <section key={e} className={s.etapa}>
            <Bot>{PERGUNTA[e]}</Bot>
            {e === atual ? (
              <div className={s.controles}>
                {e === 'horarios' && <PassoHorarios onSalvo={(h) => { setHorarios(h); proxima({ horarios: h.length }); }} />}
                {e === 'equipe' && <PassoEquipe equipe={equipe} setEquipe={setEquipe} onContinuar={() => proxima({ equipe: equipe.length })} />}
                {e === 'servicos' && <PassoServicos precos={precos} onSalvo={(n, p) => { setServicos(n); setPrecos(p); proxima({ servicos: n }); }} />}
                {e === 'clientes' && <PassoClientes onPronto={() => setAtual('pronto')} />}
              </div>
            ) : (
              resposta[e] && (
                <Eu>
                  {resposta[e]}
                  {ALTERAR[e] && atual !== 'pronto' && (
                    <button type="button" className={s.alterar} onClick={() => setAtual(e)} aria-label={ALTERAR[e]}>Alterar</button>
                  )}
                </Eu>
              )
            )}
            {e === 'clientes' && atual === 'pronto' && <Eu>Cadastrar aos poucos</Eu>}
          </section>
        ))}
        {atual === 'pronto' && (
          <>
            <Bot>{`Pronto! 🎉 O ${props.loja} está no ar. A agenda já tem horários livres, é só começar a agendar.`}</Bot>
            <div className={s.controles}><Link className="btn lg" href="/hoje">Ir para o Hoje</Link></div>
          </>
        )}
        <div ref={fim} />
      </div>
    </div>
  );
}

const PERGUNTA: Record<EtapaOnboarding, string> = {
  horarios: 'Que dias e horários vocês abrem?',
  equipe: 'Quem dá banho e quem tosa? Pode colocar todo mundo.',
  servicos: 'Já deixei os serviços mais comuns com preços sugeridos. Quer ajustar algum?',
  clientes: 'Por último: e os seus clientes? Dá para importar uma planilha ou ir cadastrando conforme chegam.',
};

function Bot({ children }: { children: ReactNode }) {
  return (
    <div className={s.linhaBot}>
      <span className={s.avatar} aria-hidden="true"><Icon name="paw" size="sm" /></span>
      <p className={`${s.balao} ${s.bot}`}>{children}</p>
    </div>
  );
}

function Eu({ children }: { children: ReactNode }) {
  return <div className={s.linhaEu}><p className={`${s.balao} ${s.eu}`}>{children}</p></div>;
}

function Erro({ texto }: { texto: string }) {
  return texto ? <p className={s.erro} role="alert">{texto}</p> : null;
}

function PassoHorarios({ onSalvo }: { onSalvo: (h: Horario[]) => void }) {
  const [outro, setOutro] = useState(false);
  const [dias, setDias] = useState<number[]>([]);
  const [abre, setAbre] = useState('08:00');
  const [fecha, setFecha] = useState('18:00');
  const [erro, setErro] = useState('');
  const [pending, start] = useTransition();
  const salvar = (h: Horario[]) => start(async () => {
    const r = await salvarHorariosAction(h);
    if (!r.ok) return setErro(r.erro);
    setErro('');
    onSalvo(h);
  });
  if (!outro) {
    return (
      <div className={s.chips}>
        {PRESETS_HORARIO.map((p) => <Button key={p.id} variant="tinted" disabled={pending} onClick={() => salvar(p.dias)}>{p.rotulo}</Button>)}
        <Button variant="gray" disabled={pending} onClick={() => setOutro(true)}>Outro horário</Button>
        <Erro texto={erro} />
      </div>
    );
  }
  return (
    <div className={`card pad ${s.form}`}>
      <div className={s.dias} role="group" aria-label="Dias abertos">
        {DIAS_CURTOS.map((d, i) => (
          <button key={d} type="button" aria-pressed={dias.includes(i)} onClick={() => setDias((x) => (x.includes(i) ? x.filter((y) => y !== i) : [...x, i]))}>{d}</button>
        ))}
      </div>
      <div className={s.duas}>
        <label className={s.campo}>Abre às<input className="input" type="time" value={abre} onChange={(e) => setAbre(e.target.value)} /></label>
        <label className={s.campo}>Fecha às<input className="input" type="time" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
      </div>
      <Erro texto={erro} />
      <Button busy={pending} busyLabel="Salvando" onClick={() => salvar(dias.map((d) => ({ diaSemana: d, abre, fecha })))}>Salvar horários</Button>
    </div>
  );
}

function PassoEquipe({ equipe, setEquipe, onContinuar }: { equipe: Pessoa[]; setEquipe: (f: (e: Pessoa[]) => Pessoa[]) => void; onContinuar: () => void }) {
  const [nome, setNome] = useState('');
  const [funcao, setFuncao] = useState<'banho' | 'tosa'>('banho');
  const [erro, setErro] = useState('');
  const [pending, start] = useTransition();
  const adicionar = () => {
    // Limpa o campo na hora: dá para digitar o próximo nome enquanto este é salvo.
    const n = nome.trim();
    const f = funcao;
    if (!n) { if (!pending) setErro('Informe o nome.'); return; }
    setNome('');
    start(async () => {
      const r = await adicionarProfissionalAction(n, f);
      if (!r.ok) { setNome((atual) => atual || n); return setErro(r.erro); }
      setEquipe((e) => [...e, { id: r.id, nome: n, funcao: f }]);
      setErro('');
    });
  };
  return (
    <div className={`card pad ${s.form}`}>
      {equipe.length > 0 && (
        <ul className={s.pessoas}>
          {equipe.map((p) => (
            <li key={p.id}>
              <span>{p.nome}<span className="cap">{p.funcao === 'banho' ? ' · banho' : ' · tosa'}</span></span>
              <button type="button" aria-label={`Remover ${p.nome}`} onClick={() => start(async () => { await removerProfissionalAction(p.id); setEquipe((e) => e.filter((x) => x.id !== p.id)); })}>
                <Icon name="x" size="sm" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <form className={s.addPessoa} onSubmit={(e) => { e.preventDefault(); adicionar(); }}>
        <label className="sr-only" htmlFor="pessoa">Nome de quem trabalha</label>
        <input id="pessoa" className="input" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome" autoComplete="off" />
        <Segmented label="Função" value={funcao} onChange={setFuncao} options={[{ value: 'banho', label: 'Banho' }, { value: 'tosa', label: 'Tosa' }]} />
        <Button variant="tinted" busy={pending} busyLabel="Adicionando">Adicionar</Button>
      </form>
      <Erro texto={erro} />
      <Button disabled={!equipe.length || pending} onClick={onContinuar}>Continuar</Button>
    </div>
  );
}

function PassoServicos({ precos, onSalvo }: { precos: PrecosPorNome; onSalvo: (n: number, precos: PrecosPorNome) => void }) {
  const [ajustando, setAjustando] = useState(false);
  const [valores, setValores] = useState(() => Object.fromEntries(Object.entries(precos).map(([n, p]) => [n, Object.fromEntries(PORTES.map((x) => [x, reais(p[x])]))])) as Record<string, Record<Porte, string>>);
  const [erro, setErro] = useState('');
  const [pending, start] = useTransition();
  const salvar = (comAjuste: boolean) => start(async () => {
    let ajuste: PrecosPorNome = {};
    if (comAjuste) {
      const lidos = Object.entries(valores).map(([n, p]) => [n, Object.fromEntries(PORTES.map((x) => [x, parseBRL(p[x])]))] as const);
      if (lidos.some(([, p]) => Object.values(p).some((v) => v === null))) return setErro('Confira os preços: use números como 75,00.');
      ajuste = Object.fromEntries(lidos) as PrecosPorNome;
    }
    const r = await salvarServicosAction(ajuste);
    if (!r.ok) return setErro(r.erro);
    onSalvo(r.total, r.precos);
  });
  if (!ajustando) {
    return (
      <div className={s.form}>
        <ul className={`card ${s.servicos}`}>
          {Object.entries(precos).map(([n, p]) => (
            <li key={n}><span>{n}</span><span className="cap num">{`a partir de R$ ${reais(Math.min(...PORTES.map((x) => p[x])))}`}</span></li>
          ))}
        </ul>
        <div className={s.chips}>
          <Button busy={pending} busyLabel="Salvando" onClick={() => salvar(false)}>Está ótimo</Button>
          <Button variant="gray" disabled={pending} onClick={() => setAjustando(true)}>Ajustar preços</Button>
        </div>
      </div>
    );
  }
  return (
    <div className={`card pad ${s.form}`}>
      {Object.keys(valores).map((n) => (
        <fieldset key={n} className={s.servico}>
          <legend>{n}</legend>
          <div className={s.portes}>
            {PORTES.map((x) => (
              <label key={x} className={s.campo}>
                <span>{PORTE_LABEL[x]}</span>
                <input className="input num" inputMode="decimal" aria-label={`${n}, ${PORTE_LABEL[x]}`} value={valores[n][x]}
                  onChange={(e) => setValores((v) => ({ ...v, [n]: { ...v[n], [x]: e.target.value } }))} />
              </label>
            ))}
          </div>
        </fieldset>
      ))}
      <Erro texto={erro} />
      <Button busy={pending} busyLabel="Salvando" onClick={() => salvar(true)}>Salvar preços</Button>
    </div>
  );
}

function PassoClientes({ onPronto }: { onPronto: () => void }) {
  const [pending, start] = useTransition();
  return (
    <div className={s.chips}>
      <Button variant="tinted" disabled={pending} onClick={() => start(async () => { await concluirAction('importar'); })}><Icon name="upload" />Importar planilha</Button>
      <Button variant="tinted" disabled={pending} onClick={() => start(async () => { await concluirAction('hoje'); onPronto(); })}><Icon name="plus" />Cadastrar aos poucos</Button>
    </div>
  );
}
