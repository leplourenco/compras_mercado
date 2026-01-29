import React, { useMemo, useRef, useState } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import type { AppState, Categoria, ItemCompra, Mercado, Produto } from '../types';
import { Autocomplete, AutocompleteOption } from '../components/Autocomplete';
import { categoriaLabel, formatBRL, parseNumberBR, normalizeNome, safeId, sanitizeDecimalBRInput, sanitizeIntegerInput } from '../utils';
import { PriceScanner } from '../components/PriceScanner';
import { calcularTotalItem, totalCompra } from '../txt';

type Props = {
  state: AppState;
  mercadosAtivos: Mercado[];
  produtosAtivos: Produto[];
  onSetMercadoId: (id: string) => void;
  onSetData: (dataISO: string) => void;
  onAddItem: (item: ItemCompra) => void;
  onUpdateItem: (id: string, patch: Partial<ItemCompra>) => void;
  onRemoveItem: (id: string) => void;
  onFinalizar: () => void;
  onGoProdutos: () => void;
};

function useElementHeight<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState(0);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height ?? 0;
      setHeight(h);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, height];
}

export function CompraAtualPage(props: Props) {
  const { state } = props;

  // Form
  const [produtoTexto, setProdutoTexto] = useState('');
  const [produtoId, setProdutoId] = useState<string>('');
  const [categoria, setCategoria] = useState<Categoria>('outro');
  const [quantidade, setQuantidade] = useState('1');
  const [precoUnitario, setPrecoUnitario] = useState('');
  const [pesoGramas, setPesoGramas] = useState('');
  const [precoPorKg, setPrecoPorKg] = useState('');
  const [scanTarget, setScanTarget] = useState<'precoUnitario' | 'precoPorKg' | null>(null);
  const [mensagem, setMensagem] = useState('');

  const totalRascunho = useMemo(() => totalCompra(state.rascunho.itens), [state.rascunho.itens]);

  const produtoOptions: AutocompleteOption<string>[] = useMemo(() => {
    return props.produtosAtivos
      .slice()
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
      .map((p) => ({
        id: p.id,
        value: p.id,
        label: p.nome,
        meta: categoriaLabel(p.categoria)
      }));
  }, [props.produtosAtivos]);

  const totalNovoItem = useMemo(() => {
    if (categoria === 'outro') {
      const q = parseNumberBR(quantidade);
      const p = parseNumberBR(precoUnitario);
      return (Number.isFinite(q) ? q : 0) * (Number.isFinite(p) ? p : 0);
    }
    const g = parseNumberBR(pesoGramas);
    const pk = parseNumberBR(precoPorKg);
    return ((Number.isFinite(g) ? g : 0) / 1000) * (Number.isFinite(pk) ? pk : 0);
  }, [categoria, quantidade, precoUnitario, pesoGramas, precoPorKg]);

  function resetForm() {
    setProdutoTexto('');
    setProdutoId('');
    setCategoria('outro');
    setQuantidade('1');
    setPrecoUnitario('');
    setPesoGramas('');
    setPrecoPorKg('');
  }

  function onSelectProduto(opt: AutocompleteOption<string>) {
    setProdutoTexto(opt.label);
    setProdutoId(opt.value);
    const p = props.produtosAtivos.find((x) => x.id === opt.value);
    if (p) {
      setCategoria(p.categoria);
      if (p.categoria === 'outro') {
        setQuantidade('1');
      } else {
        setPesoGramas('');
      }
    }
  }

  function resolveProduto(): Produto | undefined {
    if (produtoId) return props.produtosAtivos.find((p) => p.id === produtoId);
    const key = normalizeNome(produtoTexto);
    if (!key) return undefined;
    return props.produtosAtivos.find((p) => p.nomeKey === key);
  }

  function addItem() {
    setMensagem('');

    if (!state.rascunho.mercadoId) {
      setMensagem('Selecione um supermercado antes de adicionar itens.');
      return;
    }

    const p = resolveProduto();
    if (!p) {
      setMensagem('Produto não cadastrado. Vá em “Produtos” para cadastrar e depois volte.');
      return;
    }

    const base: ItemCompra = {
      id: safeId(),
      produtoId: p.id,
      produtoNome: p.nome,
      categoria: p.categoria,
      criadoEm: Date.now()
    };

    if (p.categoria === 'outro') {
      const q = parseNumberBR(quantidade);
      const pr = parseNumberBR(precoUnitario);
      if (!Number.isFinite(q) || q <= 0) {
        setMensagem('Quantidade inválida.');
        return;
      }
      if (!Number.isFinite(pr) || pr < 0) {
        setMensagem('Preço unitário inválido.');
        return;
      }
      base.quantidade = q;
      base.precoUnitario = pr;
    } else {
      const g = parseNumberBR(pesoGramas);
      const pk = parseNumberBR(precoPorKg);
      if (!Number.isFinite(g) || g <= 0) {
        setMensagem('Peso (g) inválido.');
        return;
      }
      if (!Number.isFinite(pk) || pk < 0) {
        setMensagem('Preço por kg inválido.');
        return;
      }
      base.pesoGramas = g;
      base.precoPorKg = pk;
    }

    props.onAddItem(base);
    resetForm();
  }

  const [listOuterRef, outerHeight] = useElementHeight<HTMLDivElement>();

  const itemData = useMemo(
    () => ({ itens: state.rascunho.itens, onUpdateItem: props.onUpdateItem, onRemoveItem: props.onRemoveItem }),
    [state.rascunho.itens, props.onUpdateItem, props.onRemoveItem]
  );

  const Row = ({ index, style, data }: ListChildComponentProps<typeof itemData>) => {
    const it = data.itens[index] as ItemCompra;
    const totalItem = calcularTotalItem(it);

    return (
      <div style={style} className="row">
        <div className="rowName" title={it.produtoNome}>
          <div className="rowNameText">{it.produtoNome}</div>
          <div className="rowMeta">{categoriaLabel(it.categoria)}</div>
        </div>

        {it.categoria === 'outro' ? (
          <div className="rowInputs">
            <label className="miniLabel">
              Qtde
              <input
                className="miniInput"
                inputMode="decimal"
                value={String(it.quantidade ?? '')}
                onChange={(e) => {
                  const cleaned = sanitizeDecimalBRInput(e.target.value);
                  const n = parseNumberBR(cleaned);
                  data.onUpdateItem(it.id, { quantidade: Number.isFinite(n) ? n : 0 });
                }}
              />
            </label>
            <label className="miniLabel">
              R$
              <input
                className="miniInput"
                inputMode="decimal"
                value={String(it.precoUnitario ?? '')}
                onChange={(e) => {
                  const cleaned = sanitizeDecimalBRInput(e.target.value);
                  const n = parseNumberBR(cleaned);
                  data.onUpdateItem(it.id, { precoUnitario: Number.isFinite(n) ? n : 0 });
                }}
              />
            </label>
          </div>
        ) : (
          <div className="rowInputs">
            <label className="miniLabel">
              g
              <input
                className="miniInput"
                inputMode="decimal"
                value={String(it.pesoGramas ?? '')}
                onChange={(e) => {
                  const cleaned = sanitizeIntegerInput(e.target.value);
                  const n = parseNumberBR(cleaned);
                  data.onUpdateItem(it.id, { pesoGramas: Number.isFinite(n) ? n : 0 });
                }}
              />
            </label>
            <label className="miniLabel">
              R$/kg
              <input
                className="miniInput"
                inputMode="decimal"
                value={String(it.precoPorKg ?? '')}
                onChange={(e) => {
                  const cleaned = sanitizeDecimalBRInput(e.target.value);
                  const n = parseNumberBR(cleaned);
                  data.onUpdateItem(it.id, { precoPorKg: Number.isFinite(n) ? n : 0 });
                }}
              />
            </label>
          </div>
        )}

        <div className="rowTotal" title={formatBRL(totalItem)}>
          {formatBRL(totalItem)}
        </div>

        <button className="danger" onClick={() => data.onRemoveItem(it.id)} title="Remover">
          Remover
        </button>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="content">
        <section className="card">
          <div className="cardTitle">Registro da compra</div>

          <div className="formRow">
            <div className="field grow">
              <label>Supermercado</label>
              <select
                className="select"
                value={state.rascunho.mercadoId}
                onChange={(e) => props.onSetMercadoId(e.target.value)}
              >
                <option value="">Selecione...</option>
                {props.mercadosAtivos
                  .slice()
                  .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
                  .map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nome}
                    </option>
                  ))}
              </select>
              {props.mercadosAtivos.length === 0 ? (
                <div className="hint">Cadastre um supermercado na aba “Mercados”.</div>
              ) : null}
            </div>

            <div className="field">
              <label>Data</label>
              <input
                className="numInput"
                type="date"
                value={state.rascunho.data}
                onChange={(e) => props.onSetData(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Total atual</label>
              <div className="computed">{formatBRL(totalRascunho)}</div>
            </div>

            <div className="field">
              <label>&nbsp;</label>
              <button className="primary" onClick={props.onFinalizar} disabled={state.rascunho.itens.length === 0 || !state.rascunho.mercadoId}>
                Finalizar compra
              </button>
            </div>
          </div>

          {mensagem ? <div className="msg">{mensagem}</div> : null}
        </section>

        <section className="card">
          <div className="cardTitle">Adicionar item</div>

          <div className="formRow">
            <Autocomplete
              label="Produto"
              placeholder="Comece a digitar..."
              value={produtoTexto}
              onChange={(v) => {
                setProdutoTexto(v);
                setProdutoId('');
              }}
              options={produtoOptions}
              onSelect={onSelectProduto}
            />

            <div className="field">
              <label>Tipo</label>
              <select
                className="select"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value as Categoria)}
                disabled={!!produtoId}
                title={produtoId ? 'O tipo vem do cadastro do produto' : ''}
              >
                <option value="outro">Unidade</option>
                <option value="legumes_frutas">Legumes/Frutas (peso)</option>
                <option value="carnes">Carnes (peso)</option>
              </select>
            </div>

            {categoria === 'outro' ? (
              <>
                <div className="field small">
                  <label>Qtde</label>
                  <input
                    className="numInput"
                    inputMode="decimal"
                    value={quantidade}
                    onChange={(e) => setQuantidade(sanitizeDecimalBRInput(e.target.value))}
                  />
                </div>
                <div className="field small">
                  <label>R$</label>
                  <div className="withButton">
                    <input
                      className="numInput"
                      inputMode="decimal"
                      value={precoUnitario}
                      onChange={(e) => setPrecoUnitario(sanitizeDecimalBRInput(e.target.value))}
                      placeholder="0,00"
                    />
                    <button className="secondary" type="button" title="Ler preço pela câmera" onClick={() => setScanTarget('precoUnitario')}>
                      Câmera
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="field small">
                  <label>g</label>
                  <input
                    className="numInput"
                    inputMode="numeric"
                    value={pesoGramas}
                    onChange={(e) => setPesoGramas(sanitizeIntegerInput(e.target.value))}
                    placeholder="0"
                  />
                </div>
                <div className="field small">
                  <label>R$/kg</label>
                  <div className="withButton">
                    <input
                      className="numInput"
                      inputMode="decimal"
                      value={precoPorKg}
                      onChange={(e) => setPrecoPorKg(sanitizeDecimalBRInput(e.target.value))}
                      placeholder="0,00"
                    />
                    <button className="secondary" type="button" title="Ler preço pela câmera" onClick={() => setScanTarget('precoPorKg')}>
                      Câmera
                    </button>
                  </div>
                </div>
              </>
            )}

            <div className="field">
              <label>Total</label>
              <div className="computed">{formatBRL(totalNovoItem)}</div>
            </div>

            <div className="field">
              <label>&nbsp;</label>
              <button className="primary" onClick={addItem}>
                Adicionar
              </button>
            </div>
          </div>

          <div className="hint">
            Se o produto não aparecer nas sugestões, cadastre primeiro na aba “Produtos”.
            <button className="link" type="button" onClick={props.onGoProdutos}>
              Ir para Produtos
            </button>
          </div>
        </section>

        <section className="card" style={{ flex: 1, minWidth: 480 }}>
          <div className="cardTitle">Itens da compra</div>
          <div className="listOuter" ref={listOuterRef}>
            {state.rascunho.itens.length === 0 ? (
              <div className="empty">Nenhum item adicionado ainda.</div>
            ) : (
              <List
                height={Math.max(240, outerHeight)}
                width="100%"
                itemCount={state.rascunho.itens.length}
                itemSize={64}
                itemData={itemData}
              >
                {Row}
              </List>
            )}
          </div>
        </section>

        {scanTarget ? (
          <PriceScanner
            title={scanTarget === 'precoUnitario' ? 'Ler preço (R$)' : 'Ler preço (R$/kg)'}
            onClose={() => setScanTarget(null)}
            onPrice={(price) => {
              if (scanTarget === 'precoUnitario') setPrecoUnitario(price);
              if (scanTarget === 'precoPorKg') setPrecoPorKg(price);
              setScanTarget(null);
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
