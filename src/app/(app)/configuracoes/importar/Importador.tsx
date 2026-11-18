'use client';
import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import type { ResultadoImport } from '@/db/repos/importacao';
import { CAMPO_LABEL, agruparPorTutor, validateRows, type CampoImport, type Mapping } from '@/domain/import';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/icons';
import { importar, lerPlanilha } from './actions';

type Etapa = 'arquivo' | 'colunas' | 'previa' | 'fim';
const CAMPOS = Object.keys(CAMPO_LABEL) as CampoImport[];
const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;

export function Importador() {
  const [etapa, setEtapa] = useState<Etapa>('arquivo');
  const [erro, setErro] = useState<string | null>(null);
  const [dados, setDados] = useState<{ headers: string[]; rows: string[][] } | null>(null);
  const [mapping, setMapping] = useState<Mapping>({});
  const [resultado, setResultado] = useState<ResultadoImport | null>(null);
  const [pending, start] = useTransition();
  const previa = useMemo(() => (dados ? validateRows(dados.rows, mapping) : null), [dados, mapping]);
  const clientes = previa ? agruparPorTutor(previa.ok).length : 0;
  const temTelefone = Object.values(mapping).includes('telefone') && Object.values(mapping).includes('pet');

  if (etapa === 'fim' && resultado) {
    return (
      <div className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
        <span className="tile t-green" style={{ width: 44, height: 44, borderRadius: 12 }}><Icon name="check" size="lg" /></span>
        <h2 className="title2">Importação concluída</h2>
        <p style={{ margin: 0 }}>{`${plural(resultado.tutores, 'tutor', 'tutores')}, ${plural(resultado.pets, 'pet', 'pets')} e ${plural(resultado.historicos, 'última visita', 'últimas visitas')}`}</p>
        <p className="cap" style={{ margin: 0 }}>Quem já estava cadastrado com o mesmo telefone não foi duplicado. Pacotes e pontos da planilha entram quando o módulo de caixa estiver ativo.</p>
        <Link className="btn" href="/pets">Ver pets e tutores</Link>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {etapa === 'arquivo' && (
        <form
          className="card pad"
          style={{ display: 'flex', flexDirection: 'column', gap: 14 }}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const r = await lerPlanilha(fd);
              if (!r.ok) return setErro(r.error);
              setErro(null);
              setDados({ headers: r.headers, rows: r.rows });
              setMapping(r.mapping);
              setEtapa('colunas');
            });
          }}
        >
          <p style={{ margin: 0 }}>A primeira linha da planilha precisa ter os nomes das colunas. Você vai poder conferir tudo antes de importar.</p>
          <div className="field">
            <label htmlFor="arquivo">Planilha (.xlsx ou .csv)</label>
            <input id="arquivo" name="arquivo" type="file" accept=".xlsx,.csv" className="input" style={{ paddingTop: 10 }} aria-describedby={erro ? 'arquivo-err' : undefined} aria-invalid={erro ? true : undefined} />
            {erro && <span className="err" id="arquivo-err">{erro}</span>}
          </div>
          <Button size="lg" busy={pending} busyLabel="Lendo"><Icon name="upload" />Ler planilha</Button>
        </form>
      )}

      {etapa !== 'arquivo' && dados && (
        <div>
          <p className="glabel">O que tem em cada coluna</p>
          <div className="glist">
            {dados.headers.map((h, i) => (
              <div className="row" key={i}>
                <span className="grow"><b style={{ fontWeight: 600 }}>{h || `Coluna ${i + 1}`}</b><br /><span className="cap">Ex.: {dados.rows.find((r) => r[i])?.[i] ?? '—'}</span></span>
                <label className="sr-only" htmlFor={`col-${i}`}>{`Coluna “${h}”`}</label>
                <select
                  id={`col-${i}`}
                  aria-label={`Coluna “${h}”`}
                  className="input"
                  style={{ width: 260 }}
                  value={mapping[i] ?? 'ignorar'}
                  onChange={(e) => {
                    setMapping((m) => ({ ...m, [i]: e.target.value as CampoImport }));
                    setEtapa('colunas');
                  }}
                >
                  {CAMPOS.map((c) => <option key={c} value={c}>{CAMPO_LABEL[c]}</option>)}
                </select>
              </div>
            ))}
          </div>
          {!temTelefone && <p className="err" style={{ marginTop: 8 }}>Indique pelo menos a coluna do WhatsApp/telefone e a do nome do pet.</p>}
        </div>
      )}

      {etapa === 'colunas' && <Button size="lg" disabled={!temTelefone} onClick={() => setEtapa('previa')}>Ver prévia</Button>}

      {etapa === 'previa' && previa && dados && (
        <div className="card pad" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 className="title3">
            {`${plural(clientes, 'cliente pronto', 'clientes prontos')} para importar`}
            {previa.erros.length > 0 && `, ${plural(previa.erros.length, 'linha com erro', 'linhas com erro')}`}
          </h2>
          {previa.erros.length > 0 && (
            <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--red)', fontSize: 14 }}>
              {previa.erros.slice(0, 20).map((e) => <li key={e.linha}>{`Linha ${e.linha}: ${e.motivo}`}</li>)}
              {previa.erros.length > 20 && <li>{`e mais ${previa.erros.length - 20}`}</li>}
            </ul>
          )}
          <p className="cap" style={{ margin: 0 }}>As linhas com erro ficam de fora. Você pode corrigir a planilha e importar de novo depois, sem duplicar ninguém.</p>
          <Button
            size="lg"
            disabled={!clientes}
            busy={pending}
            busyLabel="Importando"
            onClick={() => start(async () => { setResultado(await importar(dados.rows, mapping)); setEtapa('fim'); })}
          >
            {`Importar ${plural(clientes, 'cliente', 'clientes')}`}
          </Button>
        </div>
      )}
    </div>
  );
}
