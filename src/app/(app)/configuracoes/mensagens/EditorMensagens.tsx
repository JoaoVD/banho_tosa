'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState, useTransition } from 'react';
import { TEMPLATE_VARS, TIPOS_MENSAGEM, TIPO_LABEL, renderTemplate, type TipoMensagem } from '@/domain/templates';
import { Button } from '@/ui/Button';
import { Icon } from '@/ui/icons';
import { Sheet } from '@/ui/Sheet';
import { useToast } from '@/ui/Toast';
import { restaurarTexto, salvarTexto } from './actions';

const EXEMPLO: Record<string, string> = {
  tutor: 'Ana', pet: 'Thor', dia: 'quinta, 19/11', hora: '10:00', servico: 'Banho', pacote: '4 banhos no mês',
  total: 'R$ 1.240,00', pix: 'R$ 860,00', credito: 'R$ 180,00', debito: 'R$ 120,00', dinheiro: 'R$ 80,00', gaveta: 'confere',
};

export function EditorMensagens({ textos, editados }: { textos: Record<TipoMensagem, string>; editados: TipoMensagem[] }) {
  const [aberto, setAberto] = useState<TipoMensagem | null>(null);
  return (
    <>
      <div className="glist">
        {TIPOS_MENSAGEM.map((t) => (
          <button key={t} type="button" className="row" onClick={() => setAberto(t)}>
            <span className="grow">
              <b style={{ fontWeight: 600 }}>{TIPO_LABEL[t]}</b>{editados.includes(t) && <span className="cap"> · personalizado</span>}<br />
              <span className="cap">{textos[t]}</span>
            </span>
            <Icon name="chev" size="sm" />
          </button>
        ))}
      </div>
      {aberto && <Editor tipo={aberto} inicial={textos[aberto]} personalizado={editados.includes(aberto)} onClose={() => setAberto(null)} />}
    </>
  );
}

function Editor({ tipo, inicial, personalizado, onClose }: { tipo: TipoMensagem; inicial: string; personalizado: boolean; onClose: () => void }) {
  const router = useRouter();
  const toast = useToast();
  const [texto, setTexto] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const area = useRef<HTMLTextAreaElement>(null);
  const inserir = (v: string) => {
    const el = area.current;
    const pos = el?.selectionStart ?? texto.length;
    const novo = `${texto.slice(0, pos)}{${v}}${texto.slice(pos)}`;
    setTexto(novo);
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(pos + v.length + 2, pos + v.length + 2); });
  };
  return (
    <Sheet open onClose={onClose} title={TIPO_LABEL[tipo]}>
      <div className="field">
        <label htmlFor="texto-modelo">Texto da mensagem</label>
        <textarea id="texto-modelo" ref={area} className="input" value={texto} onChange={(e) => { setTexto(e.target.value); setErro(null); }} aria-invalid={erro ? true : undefined} aria-describedby={erro ? 'texto-err' : undefined} />
        {erro && <span className="err" id="texto-err">{erro}</span>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} role="group" aria-label="Inserir variável">
        {TEMPLATE_VARS[tipo].map((v) => <button key={v} type="button" className="btn tinted sm" onClick={() => inserir(v)}>{`{${v}}`}</button>)}
      </div>
      <div>
        <p className="glabel">Prévia</p>
        <div style={{ background: 'var(--tint)', color: 'var(--on-tint)', borderRadius: '20px 20px 6px 20px', padding: '9px 14px', marginLeft: 'auto', maxWidth: '90%', width: 'fit-content', whiteSpace: 'pre-wrap' }}>
          {renderTemplate(texto, EXEMPLO)}
        </div>
      </div>
      <Button size="lg" busy={pending} busyLabel="Salvando" onClick={() => start(async () => {
        const r = await salvarTexto(tipo, texto);
        if (!r.ok) return setErro(r.error ?? null);
        toast('Texto salvo');
        router.refresh();
        onClose();
      })}>Salvar texto</Button>
      {personalizado && (
        <Button variant="gray" onClick={() => start(async () => { await restaurarTexto(tipo); toast('Texto padrão restaurado'); router.refresh(); onClose(); })}>Voltar ao texto padrão</Button>
      )}
    </Sheet>
  );
}
