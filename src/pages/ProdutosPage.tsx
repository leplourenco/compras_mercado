import React, { useMemo, useState } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import type { Categoria, Produto } from '../types';
import { categoriaLabel, normalizeNome } from '../utils';

type Props = {
  produtos: Produto[];
  onAdd: (nome: string, categoria: Categoria) => void;
  onUpdate: (id: string, patch: Partial<Produto>) => void;
  onToggleAtivo: (id: string) => void;
};

export function ProdutosPage(props: Props) {
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState<Categoria>('outro');
  const [filtro, setFiltro] = useState('');
  const [msg, setMsg] = useState('');

  const lista = useMemo(() => {
    const t = normalizeNome(filtro);
    return props.produtos
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .filter((p) => (!t ? true : p.nomeKey.includes(t) || p.nome.toLowerCase().includes(t)));
  }, [props.produtos, filtro]);

  function add() {
    setMsg('');
    const n = nome.trim().replace(/\s+/g, ' ');
    if (!n) {
      setMsg('Informe o nome do produto.');
      return;
    }
    props.onAdd(n, categoria);
    setNome('');
    setCategoria('outro');
  }

  const itemData = useMemo(() => ({ lista, onUpdate: props.onUpdate, onToggleAtivo: props.onToggleAtivo }), [lista, props.onUpdate, props.onToggleAtivo]);

  const Row = ({ index, style, data }: ListChildComponentProps<typeof itemData>) => {
    const p = data.lista[index] as Produto;
    return (
      <div style={style} className="row rowAlt">
        <div className="rowName" title={p.nome}>
          <div className="rowNameText">{p.nome}</div>
          <div className="rowMeta">
            {categoriaLabel(p.categoria)} {p.ativo ? '' : '• Inativo'}
          </div>
        </div>

        <div className="rowInputs">
          <label className="miniLabel">
            Tipo
            <select
              className="miniSelect"
              value={p.categoria}
              onChange={(e) => data.onUpdate(p.id, { categoria: e.target.value as any, atualizadoEm: Date.now() })}
            >
              <option value="outro">Unidade</option>
              <option value="legumes_frutas">Legumes/Frutas (peso)</option>
              <option value="carnes">Carnes (peso)</option>
            </select>
          </label>
          <label className="miniLabel">
            Nome
            <input
              className="miniInputWide"
              value={p.nome}
              onChange={(e) => data.onUpdate(p.id, { nome: e.target.value, nomeKey: normalizeNome(e.target.value), atualizadoEm: Date.now() })}
            />
          </label>
        </div>

        <button className={p.ativo ? 'danger' : ''} onClick={() => data.onToggleAtivo(p.id)}>
          {p.ativo ? 'Inativar' : 'Ativar'}
        </button>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="content">
        <section className="card">
          <div className="cardTitle">Cadastrar produto</div>
          <div className="formRow">
            <div className="field grow">
              <label>Nome</label>
              <input className="textInput" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Arroz" />
            </div>
            <div className="field">
              <label>Tipo</label>
              <select className="select" value={categoria} onChange={(e) => setCategoria(e.target.value as Categoria)}>
                <option value="outro">Unidade</option>
                <option value="legumes_frutas">Legumes/Frutas (peso)</option>
                <option value="carnes">Carnes (peso)</option>
              </select>
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
          <div className="cardTitle">Produtos</div>
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
              <div className="empty">Nenhum produto cadastrado.</div>
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
