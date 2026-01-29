import React, { useMemo, useState } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import type { Compra, Mercado } from '../types';
import { formatBRL } from '../utils';
import { totalCompra, calcularTotalItem } from '../txt';

type Props = {
  compras: Compra[];
  mercados: Mercado[];
  onDeleteCompra: (id: string) => void;
};

export function HistoricoPage(props: Props) {
  const [filtroMercadoId, setFiltroMercadoId] = useState<string>('');
  const [de, setDe] = useState<string>('');
  const [ate, setAte] = useState<string>('');
  const [selecionadaId, setSelecionadaId] = useState<string>('');

  const comprasFiltradas = useMemo(() => {
    const base = props.compras.slice().sort((a, b) => (a.data < b.data ? 1 : -1));
    return base.filter((c) => {
      if (filtroMercadoId && c.mercadoId !== filtroMercadoId) return false;
      if (de && c.data < de) return false;
      if (ate && c.data > ate) return false;
      return true;
    });
  }, [props.compras, filtroMercadoId, de, ate]);

  const selecionada = useMemo(
    () => comprasFiltradas.find((c) => c.id === selecionadaId) ?? comprasFiltradas[0],
    [comprasFiltradas, selecionadaId]
  );

  const itemData = useMemo(
    () => ({ compras: comprasFiltradas, onSelect: (id: string) => setSelecionadaId(id) }),
    [comprasFiltradas]
  );

  const Row = ({ index, style, data }: ListChildComponentProps<typeof itemData>) => {
    const c = data.compras[index] as Compra;
    const total = totalCompra(c.itens);
    const active = c.id === (selecionada?.id ?? '');
    return (
      <button type="button" style={style} className={active ? 'listItem active' : 'listItem'} onClick={() => data.onSelect(c.id)}>
        <div className="listItemTitle">{c.data} • {c.mercadoNome}</div>
        <div className="listItemMeta">{c.itens.length} itens • <strong>{formatBRL(total)}</strong></div>
      </button>
    );
  };

  return (
    <div className="page">
      <div className="content">
        <section className="card" style={{ minWidth: 380, flex: 1 }}>
          <div className="cardTitle">Histórico de compras</div>

          <div className="formRow" style={{ marginBottom: 10 }}>
            <div className="field grow">
              <label>Supermercado</label>
              <select className="select" value={filtroMercadoId} onChange={(e) => setFiltroMercadoId(e.target.value)}>
                <option value="">Todos</option>
                {props.mercados
                  .slice()
                  .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}{m.ativo ? '' : ' (inativo)'}
                    </option>
                  ))}
              </select>
            </div>
            <div className="field">
              <label>De</label>
              <input className="numInput" type="date" value={de} onChange={(e) => setDe(e.target.value)} />
            </div>
            <div className="field">
              <label>Até</label>
              <input className="numInput" type="date" value={ate} onChange={(e) => setAte(e.target.value)} />
            </div>
          </div>

          <div className="listOuter" style={{ height: '60vh' }}>
            {comprasFiltradas.length === 0 ? (
              <div className="empty">Nenhuma compra encontrada.</div>
            ) : (
              <List
                height={Math.max(260, Math.min(700, comprasFiltradas.length * 72))}
                width="100%"
                itemCount={comprasFiltradas.length}
                itemSize={72}
                itemData={itemData}
              >
                {Row}
              </List>
            )}
          </div>
        </section>

        <section className="card" style={{ minWidth: 420, flex: 1 }}>
          <div className="cardTitle">Detalhes</div>
          {!selecionada ? (
            <div className="empty">Selecione uma compra.</div>
          ) : (
            <>
              <div className="detailHeader">
                <div>
                  <div className="detailTitle">{selecionada.data} • {selecionada.mercadoNome}</div>
                  <div className="detailMeta">{selecionada.itens.length} itens • <strong>{formatBRL(totalCompra(selecionada.itens))}</strong></div>
                </div>
                <button
                  className="danger"
                  onClick={() => {
                    if (!confirm('Excluir esta compra do histórico?')) return;
                    props.onDeleteCompra(selecionada.id);
                    setSelecionadaId('');
                  }}
                >
                  Excluir
                </button>
              </div>

              <div className="detailList">
                {selecionada.itens.map((it) => (
                  <div key={it.id} className="detailRow">
                    <div className="detailRowName">{it.produtoNome}</div>
                    <div className="detailRowMeta">
                      {it.categoria === 'outro'
                        ? `${it.quantidade ?? 0} x ${formatBRL(it.precoUnitario ?? 0)}`
                        : `${it.pesoGramas ?? 0} g x ${formatBRL(it.precoPorKg ?? 0)}/kg`}
                    </div>
                    <div className="detailRowTotal">{formatBRL(calcularTotalItem(it))}</div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
