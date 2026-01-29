import React, { useMemo, useState } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import type { Mercado } from '../types';
import { normalizeNome } from '../utils';

type Props = {
  mercados: Mercado[];
  onAdd: (nome: string) => void;
  onUpdate: (id: string, patch: Partial<Mercado>) => void;
  onToggleAtivo: (id: string) => void;
};

export function MercadosPage(props: Props) {
  const [nome, setNome] = useState('');
  const [filtro, setFiltro] = useState('');
  const [msg, setMsg] = useState('');

  const lista = useMemo(() => {
    const t = normalizeNome(filtro);
    return props.mercados
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .filter((m) => (!t ? true : m.nomeKey.includes(t) || m.nome.toLowerCase().includes(t)));
  }, [props.mercados, filtro]);

  function add() {
    setMsg('');
    const n = nome.trim().replace(/\s+/g, ' ');
    if (!n) {
      setMsg('Informe o nome do supermercado.');
      return;
    }
    props.onAdd(n);
    setNome('');
  }

  const itemData = useMemo(
    () => ({ lista, onUpdate: props.onUpdate, onToggleAtivo: props.onToggleAtivo }),
    [lista, props.onUpdate, props.onToggleAtivo]
  );

  const Row = ({ index, style, data }: ListChildComponentProps<typeof itemData>) => {
    const m = data.lista[index] as Mercado;
    return (
      <div style={style} className="row rowAlt">
        <div className="rowName" title={m.nome}>
          <div className="rowNameText">{m.nome}</div>
          <div className="rowMeta">{m.ativo ? '' : 'Inativo'}</div>
        </div>

        <div className="rowInputs">
          <label className="miniLabel">
            Nome
            <input
              className="miniInputWide"
              value={m.nome}
              onChange={(e) => data.onUpdate(m.id, { nome: e.target.value, nomeKey: normalizeNome(e.target.value), atualizadoEm: Date.now() })}
            />
          </label>
        </div>

        <button className={m.ativo ? 'danger' : ''} onClick={() => data.onToggleAtivo(m.id)}>
          {m.ativo ? 'Inativar' : 'Ativar'}
        </button>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="content">
        <section className="card">
          <div className="cardTitle">Cadastrar supermercado</div>
          <div className="formRow">
            <div className="field grow">
              <label>Nome</label>
              <input className="textInput" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Atacadão" />
            </div>
            <div className="field">
              <label>&nbsp;</label>
              <button className="primary" onClick={add}>
                Adicionar
              </button>
            </div>
          </div>
          {msg ? <div className="msg">{msg}</div> : null}
        </section>

        <section className="card" style={{ flex: 1, minWidth: 520 }}>
          <div className="cardTitle">Supermercados</div>
          <div className="formRow" style={{ marginBottom: 10 }}>
            <div className="field grow">
              <label>Buscar</label>
              <input className="textInput" value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Digite para filtrar..." />
            </div>
            <div className="field">
              <label>Total</label>
              <div className="computed">{lista.length}</div>
            </div>
          </div>

          <div className="listOuter" style={{ height: '60vh' }}>
            {lista.length === 0 ? (
              <div className="empty">Nenhum supermercado cadastrado.</div>
            ) : (
              <List height={Math.max(260, Math.min(700, lista.length * 72))} width="100%" itemCount={lista.length} itemSize={72} itemData={itemData}>
                {Row}
              </List>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
